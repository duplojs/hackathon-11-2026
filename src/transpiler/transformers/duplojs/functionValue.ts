import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../context/build";
import { transformCheckerType, type GoType } from "../type";
import { getFunctionTypes } from "./either/members";

export interface FunctionValueParameter {
	readonly identifier: GoAST.Identifier;
	readonly type: Type;
	readonly goType: GoType;
}

export interface FunctionValueBody {
	readonly before?: readonly GoAST.Statement[];
	readonly result: GoAST.Expression;
}

export type CreateFunctionValueBody = (
	parameters: readonly FunctionValueParameter[],
	returnType: Type,
) => Promise<
	| DEither.Success<FunctionValueBody>
	| ReturnType<BuildContext["error"]>
	| Extract<Awaited<ReturnType<Transformer<GoAST.Expression>["transformer"]>>, DEither.Left>
>;

// Fonction DuploJS passée en valeur (`pipe(value, DString.length)`) : Go ne manipule pas une
// fonction générique sans l'instancier. Le type attendu à cet endroit (fourni par le contexte)
// fixe ses paramètres et son retour ; une fonction littérale Go typée réalise l'appel.
export async function createFunctionValue(
	node: TsAST.Node,
	context: BuildContext,
	createBody: CreateFunctionValueBody,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isExpression(node)) {
		return context.notSupport();
	}

	const expectedType = await context.transpilation.typeChecker.getContextualType(node);

	if (!expectedType) {
		return context.error(node, "function-value-without-expected-type");
	}

	const expected = await getFunctionTypes(expectedType, node, context);

	if (DEither.isLeft(expected)) {
		return expected;
	}

	const { parameters, returnType } = DEither.unwrapRight(expected);
	const translatedParameters = await DCommon.asyncPipe(
		parameters,
		DArray.map(
			async(parameterType) => DEither.rightPipe(
				await transformCheckerType(parameterType, node, context),
				(goType) => DEither.success<FunctionValueParameter>({
					identifier: context.generateIdentifier("parameter"),
					type: parameterType,
					goType,
				}),
			),
		),
		DCommon.promiseAll,
		DArray.reduce(
			DArray.reduceFrom<readonly FunctionValueParameter[]>([]),
			({ element, lastValue, next, exit }) => DEither.isLeft(element)
				? exit(element)
				: next(DArray.push(lastValue, DEither.unwrapRight(element))),
		),
	);

	if (DEither.isLeft(translatedParameters)) {
		return translatedParameters;
	}

	const returnGoType = await transformCheckerType(returnType, node, context);

	if (DEither.isLeft(returnGoType)) {
		return returnGoType;
	}

	const body = await createBody(translatedParameters, returnType);

	if (DEither.isLeft(body)) {
		return body;
	}

	const { before = [], result } = DEither.unwrapRight(body);

	return context.success({
		result: GoAST.createFunctionLiteral({
			arguments: DArray.map(
				translatedParameters,
				({ identifier, goType }) => GoAST.createFunctionArgument({
					identifier,
					type: goType,
				}),
			),
			returnTypes: [DEither.unwrapRight(returnGoType)],
			body: GoAST.createBlockStatement({
				statements: DArray.push(before, GoAST.createReturnStatement({ values: [result] })),
			}),
		}),
	});
}

import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { transformCheckerType } from "../../../type";
import { getFunctionTypes } from "../../either/members";

interface CreateCoalescingParams {
	readonly value: GoAST.Expression;
	readonly valueType: Type;
	readonly resultType: Type;
	readonly location: TsAST.Node;
	readonly context: BuildContext;
}

// `coalescing(value)` : un tableau est gardé tel quel, une autre valeur est placée dans un tableau
// d'un élément. Le choix dépend du type de la valeur, connu à la compilation : aucun test à
// l'exécution. Le résultat `readonly [T]` est un tuple, donc un tableau Go `[1]T`.
async function createCoalescing(params: CreateCoalescingParams) {
	const { value, valueType, resultType, location, context } = params;

	const valueGoType = await transformCheckerType(valueType, location, context);

	if (DEither.isLeft(valueGoType)) {
		return valueGoType;
	}

	const valueRepresentation = DEither.unwrapRight(valueGoType);

	if (
		DModeling.hasTagValue(valueRepresentation, "[node][type]slice")
		|| DModeling.hasTagValue(valueRepresentation, "[node][type]array")
	) {
		return DEither.success<GoAST.Expression>(value);
	}

	const resultGoType = await transformCheckerType(resultType, location, context);

	if (DEither.isLeft(resultGoType)) {
		return resultGoType;
	}

	const resultRepresentation = DEither.unwrapRight(resultGoType);

	if (!DModeling.hasTagValue(resultRepresentation, "[node][type]array")) {
		return context.error(location, "coalescing-result-not-supported");
	}

	return DEither.success<GoAST.Expression>(
		GoAST.createArrayLiteral({
			typeReference: resultRepresentation,
			elements: [value],
		}),
	);
}

export async function coalescingExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const { typeChecker } = context.transpilation;

	if (TsAST.isCallExpression(node)) {
		const [valueNode] = node.arguments;

		if (!valueNode || !DArray.lengthEqual(node.arguments, 1)) {
			return context.error(node, "coalescing-expects-one-argument");
		}

		const value = await DCommon.asyncPipe(
			context.transform(valueNode, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(value)) {
			return value;
		}

		const coalesced = await createCoalescing({
			value: value.result,
			valueType: await typeChecker.getTypeAtLocation(valueNode),
			resultType: await typeChecker.getTypeAtLocation(node),
			location: node,
			context,
		});

		if (DEither.isLeft(coalesced)) {
			return coalesced;
		}

		return context.success({
			before: value.before,
			result: DEither.unwrapRight(coalesced),
		});
	}

	// Fonction passée en valeur (`whenIsRight(result, DArray.coalescing)`) : la fonction est générique,
	// le type attendu à cet endroit fixe son paramètre et son résultat.
	if (!TsAST.isExpression(node)) {
		return context.notSupport();
	}

	const expectedType = await typeChecker.getContextualType(node);

	if (!expectedType) {
		return context.error(node, "coalescing-reference-without-expected-type");
	}

	const expected = await getFunctionTypes(expectedType, node, context);

	if (DEither.isLeft(expected)) {
		return expected;
	}

	const { parameters, returnType } = DEither.unwrapRight(expected);
	const [parameterType] = parameters;

	if (!parameterType) {
		return context.error(node, "coalescing-reference-without-parameter");
	}

	const parameterGoType = await transformCheckerType(parameterType, node, context);

	if (DEither.isLeft(parameterGoType)) {
		return parameterGoType;
	}

	const returnGoType = await transformCheckerType(returnType, node, context);

	if (DEither.isLeft(returnGoType)) {
		return returnGoType;
	}

	const parameter = context.generateIdentifier("value");

	const coalesced = await createCoalescing({
		value: parameter,
		valueType: parameterType,
		resultType: returnType,
		location: node,
		context,
	});

	if (DEither.isLeft(coalesced)) {
		return coalesced;
	}

	return context.success({
		result: GoAST.createFunctionLiteral({
			arguments: [
				GoAST.createFunctionArgument({
					identifier: parameter,
					type: DEither.unwrapRight(parameterGoType),
				}),
			],
			returnTypes: [DEither.unwrapRight(returnGoType)],
			body: GoAST.createBlockStatement({
				statements: [GoAST.createReturnStatement({ values: [DEither.unwrapRight(coalesced)] })],
			}),
		}),
	});
}

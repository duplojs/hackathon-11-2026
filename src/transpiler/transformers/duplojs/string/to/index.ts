import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { TypeFlags, type Type } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { transformCheckerType } from "../../../type";
import { inspectDependency, numberToStringIdentifier } from "../../common/print/sharedDependency";
import { getFunctionTypes } from "../../either/members";

// `${value}` : la conversion dépend du type statique de la valeur, connu à la compilation.
// Un nombre suit `Number::toString` (le même algorithme que l'affichage de `print`).
function createConversion(
	value: GoAST.Expression,
	valueType: Type,
	location: TsAST.Node,
	context: BuildContext,
) {
	if (valueType.flags & TypeFlags.NumberLike) {
		return DEither.success<GoAST.Expression>(
			GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: context.registerSharedDependency(inspectDependency.value),
					identifier: numberToStringIdentifier,
				}),
				arguments: [value],
			}),
		);
	}

	if (valueType.flags & TypeFlags.StringLike) {
		return DEither.success<GoAST.Expression>(value);
	}

	return context.error(location, "string-to-type-not-supported");
}

export async function toExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const { typeChecker } = context.transpilation;

	if (TsAST.isCallExpression(node)) {
		const [valueNode] = node.arguments;

		if (!valueNode || !DArray.lengthEqual(node.arguments, 1)) {
			return context.error(node, "string-to-expects-one-argument");
		}

		const value = await DCommon.asyncPipe(
			context.transform(valueNode, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(value)) {
			return value;
		}

		const conversion = createConversion(
			value.result,
			await typeChecker.getTypeAtLocation(valueNode),
			node,
			context,
		);

		if (DEither.isLeft(conversion)) {
			return conversion;
		}

		return context.success({
			before: value.before,
			result: DEither.unwrapRight(conversion),
		});
	}

	// Fonction passée en valeur (`DArray.map(values, DString.to)`) : Go ne manipule pas une fonction
	// générique sans l'instancier. Le type attendu à cet endroit fixe le paramètre, et une fonction
	// littérale réalise la conversion correspondante.
	if (!TsAST.isExpression(node)) {
		return context.notSupport();
	}

	const expectedType = await typeChecker.getContextualType(node);

	if (!expectedType) {
		return context.error(node, "string-to-reference-without-expected-type");
	}

	const expected = await getFunctionTypes(expectedType, node, context);

	if (DEither.isLeft(expected)) {
		return expected;
	}

	const [parameterType] = DEither.unwrapRight(expected).parameters;

	if (!parameterType) {
		return context.error(node, "string-to-reference-without-parameter");
	}

	const parameterGoType = await transformCheckerType(parameterType, node, context);

	if (DEither.isLeft(parameterGoType)) {
		return parameterGoType;
	}

	const parameter = context.generateIdentifier("value");
	const conversion = createConversion(parameter, parameterType, node, context);

	if (DEither.isLeft(conversion)) {
		return conversion;
	}

	return context.success({
		result: GoAST.createFunctionLiteral({
			arguments: [
				GoAST.createFunctionArgument({
					identifier: parameter,
					type: DEither.unwrapRight(parameterGoType),
				}),
			],
			returnTypes: [GoAST.builtinTypeReferences.string],
			body: GoAST.createBlockStatement({
				statements: [GoAST.createReturnStatement({ values: [DEither.unwrapRight(conversion)] })],
			}),
		}),
	});
}

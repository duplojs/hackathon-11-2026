import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { typeTransformers } from "../../../type";
import { eitherErrorDependency, errorFunctionIdentifier, errorTypeIdentifier } from "./sharedDependency";

/**
 * `DEither.error(value)` → `shard_dependencies.EitherErrorOf(value)`.
 */
export async function errorExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (TsAST.isCallExpression(node)) {
		if (node.arguments.length !== 1) {
			return context.error(node, "error-requires-value");
		}

		const [valArg] = node.arguments;
		if (!valArg) {
			return context.error(node, "error-requires-value");
		}
		const transformedVal = await DCommon.asyncPipe(
			context.transform(valArg, expressionTransformers.value),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(transformedVal)) {
			return transformedVal;
		}

		const pkg = context.registerSharedDependency(eitherErrorDependency.value);

		return context.success({
			before: transformedVal.before ?? [],
			result: GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: pkg,
					identifier: errorFunctionIdentifier,
				}),
				arguments: [transformedVal.result],
			}),
		});
	}

	return context.success({
		result: GoAST.createSelectorExpression({
			target: context.registerSharedDependency(eitherErrorDependency.value),
			identifier: errorFunctionIdentifier,
		}),
	});
}

/**
 * Type `DEither.Error<V>` → `shard_dependencies.EitherError[V]`.
 */
export async function errorTypeHandler(
	node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode,
	context: BuildContext,
) {
	const valueNode = node.typeArguments && DArray.at(node.typeArguments, 0);

	if (!valueNode) {
		return context.notSupport();
	}

	const value = await DCommon.asyncPipe(
		context.transform(valueNode, typeTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(value)) {
		return value;
	}

	return context.success({
		before: value.before,
		result: GoAST.createGenericTypeReference({
			typeReference: GoAST.createPackageTypeReference({
				packageName: context.registerSharedDependency(eitherErrorDependency.value),
				identifier: errorTypeIdentifier,
			}),
			typeArguments: DCommon.cast([value.result]),
		}),
	});
}

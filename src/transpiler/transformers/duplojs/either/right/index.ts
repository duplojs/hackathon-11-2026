import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { callExpressionTransformer } from "../../../shared";
import { expressionTransformers } from "../../../expression";
import { typeTransformers } from "../../../type";
import { undefinedShardDependency } from "../../../../sharedDependency/defaults/undefined";
import { eitherRightDependency, rightFunctionIdentifier, rightTypeIdentifier } from "./sharedDependency";

/**
 * `DEither.right("information", value)` → `shard_dependencies.EitherRightOf("information", value)`.
 * `DEither.right("information")` → `shard_dependencies.EitherRightOf("information", shard_dependencies.JSUndefined{})`.
 */
export async function rightExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (TsAST.isCallExpression(node)) {
		if (node.arguments.length === 2) {
			return context.transform(node, [callExpressionTransformer]);
		}

		if (node.arguments.length === 1) {
			const [infoArg] = node.arguments;
			if (!infoArg) {
				return context.error(node, "right-missing-information-argument");
			}
			const transformedInfo = await DCommon.asyncPipe(
				context.transform(infoArg, expressionTransformers.value),
				DEither.unwrapRight,
			);
			if (DEither.isLeft(transformedInfo)) {
				return transformedInfo;
			}

			const pkg = context.registerSharedDependency(eitherRightDependency.value);
			context.registerSharedDependency(undefinedShardDependency.value);

			return context.success({
				before: transformedInfo.before ?? [],
				result: GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: pkg,
						identifier: rightFunctionIdentifier,
					}),
					arguments: [
						transformedInfo.result,
						GoAST.createStructLiteral({
							typeReference: GoAST.createPackageTypeReference({
								packageName: pkg,
								identifier: GoAST.createIdentifier("JSUndefined"),
							}),
							elements: [],
						}),
					],
				}),
			});
		}

		return context.error(node, "right-requires-information");
	}

	return context.success({
		result: GoAST.createSelectorExpression({
			target: context.registerSharedDependency(eitherRightDependency.value),
			identifier: rightFunctionIdentifier,
		}),
	});
}

/**
 * Type `DEither.Right<"information", V>` → `shard_dependencies.EitherRight[V]`.
 */
export async function rightTypeHandler(
	node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode,
	context: BuildContext,
) {
	const valueNode = node.typeArguments && DArray.at(node.typeArguments, 1);

	if (!valueNode) {
		const pkg = context.registerSharedDependency(eitherRightDependency.value);
		context.registerSharedDependency(undefinedShardDependency.value);
		return context.success({
			result: GoAST.createGenericTypeReference({
				typeReference: GoAST.createPackageTypeReference({
					packageName: pkg,
					identifier: rightTypeIdentifier,
				}),
				typeArguments: DCommon.cast([
					GoAST.createPackageTypeReference({
						packageName: pkg,
						identifier: GoAST.createIdentifier("JSUndefined"),
					}),
				]),
			}),
		});
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
				packageName: context.registerSharedDependency(eitherRightDependency.value),
				identifier: rightTypeIdentifier,
			}),
			typeArguments: DCommon.cast([value.result]),
		}),
	});
}

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
import { eitherLeftDependency, leftFunctionIdentifier, leftTypeIdentifier } from "./sharedDependency";

/**
 * `DEither.left("information", value)` → `shard_dependencies.EitherLeftOf("information", value)`.
 * `DEither.left("information")` → `shard_dependencies.EitherLeftOf("information", shard_dependencies.JSUndefined{})`.
 */
export async function leftExpressionHandler(
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
				return context.error(node, "left-missing-information-argument");
			}
			const transformedInfo = await DCommon.asyncPipe(
				context.transform(infoArg, expressionTransformers.value),
				DEither.unwrapRight,
			);
			if (DEither.isLeft(transformedInfo)) {
				return transformedInfo;
			}

			const pkg = context.registerSharedDependency(eitherLeftDependency.value);
			context.registerSharedDependency(undefinedShardDependency.value);

			return context.success({
				before: transformedInfo.before ?? [],
				result: GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: pkg,
						identifier: leftFunctionIdentifier,
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

		return context.error(node, "left-requires-information");
	}

	return context.success({
		result: GoAST.createSelectorExpression({
			target: context.registerSharedDependency(eitherLeftDependency.value),
			identifier: leftFunctionIdentifier,
		}),
	});
}

/**
 * Type `DEither.Left<"information", V>` seul → `shard_dependencies.EitherLeft[V]`.
 */
export async function leftTypeHandler(
	node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode,
	context: BuildContext,
) {
	const valueNode = node.typeArguments && DArray.at(node.typeArguments, 1);

	if (!valueNode) {
		const pkg = context.registerSharedDependency(eitherLeftDependency.value);
		context.registerSharedDependency(undefinedShardDependency.value);
		return context.success({
			result: GoAST.createGenericTypeReference({
				typeReference: GoAST.createPackageTypeReference({
					packageName: pkg,
					identifier: leftTypeIdentifier,
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
				packageName: context.registerSharedDependency(eitherLeftDependency.value),
				identifier: leftTypeIdentifier,
			}),
			typeArguments: DCommon.cast([value.result]),
		}),
	});
}

import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { transformCheckerType, typeTransformers } from "../../../type";
import { createFunctionValue } from "../../functionValue";
import { eitherSuccessDependency, successFunctionIdentifier, successTypeIdentifier } from "./sharedDependency";

export async function successExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	// Go ne permet pas de manipuler une fonction générique sans l'instancier : passée en valeur
	// (`pipe(value, DEither.success)`), elle est instanciée selon le type attendu à cet endroit.
	if (!TsAST.isCallExpression(node)) {
		return createFunctionValue(
			node,
			context,
			async([parameter]) => parameter
				? DEither.success({
					result: GoAST.createCallExpression({
						callee: GoAST.createInstantiationExpression({
							target: GoAST.createSelectorExpression({
								target: context.registerSharedDependency(eitherSuccessDependency.value),
								identifier: successFunctionIdentifier,
							}),
							typeArguments: DCommon.cast([parameter.goType]),
						}),
						arguments: [parameter.identifier],
					}),
				})
				: context.error(node, "success-expects-one-argument"),
		);
	}

	const [valueNode] = node.arguments;

	if (!valueNode || !DArray.lengthEqual(node.arguments, 1)) {
		return context.error(node, "success-expects-one-argument");
	}

	const value = await DCommon.asyncPipe(
		context.transform(valueNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(value)) {
		return value;
	}

	const successType = await transformCheckerType(
		await context.transpilation.typeChecker.getTypeAtLocation(node),
		node,
		context,
	);

	if (DEither.isLeft(successType)) {
		return successType;
	}

	const successTypeReference = DEither.unwrapRight(successType);

	if (!DModeling.hasTagValue(successTypeReference, "[node]type-reference-generic")) {
		return context.error(node, "success-type-not-resolved");
	}

	return context.success({
		before: value.before,
		result: GoAST.createCallExpression({
			callee: GoAST.createInstantiationExpression({
				target: GoAST.createSelectorExpression({
					target: context.registerSharedDependency(eitherSuccessDependency.value),
					identifier: successFunctionIdentifier,
				}),
				typeArguments: successTypeReference.typeArguments,
			}),
			arguments: [value.result],
		}),
	});
}

export async function successTypeHandler(
	node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode,
	context: BuildContext,
) {
	const argumentNode = node.typeArguments && DArray.first(node.typeArguments);

	if (!argumentNode) {
		return context.notSupport();
	}

	const argument = await DCommon.asyncPipe(
		context.transform(argumentNode, typeTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	return context.success({
		before: argument.before,
		result: GoAST.createGenericTypeReference({
			typeReference: GoAST.createPackageTypeReference({
				packageName: context.registerSharedDependency(eitherSuccessDependency.value),
				identifier: successTypeIdentifier,
			}),
			typeArguments: DCommon.cast([argument.result]),
		}),
	});
}

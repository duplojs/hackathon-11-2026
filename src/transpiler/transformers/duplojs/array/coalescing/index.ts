import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { callExpressionTransformer } from "../../../shared";
import { arrayCoalescingDependency, arrayCoalescingFunctionIdentifier } from "./sharedDependency";

export async function coalescingExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (TsAST.isCallExpression(node)) {
		if (node.arguments.length === 1) {
			const arg = node.arguments[0];
			if (!arg) {
				return context.error(node, "coalescing-missing-argument");
			}
			const argType = await context.transpilation.typeChecker.getTypeAtLocation(arg);
			const isArray = (await context.transpilation.typeChecker.isArrayType(argType))
				|| (await context.transpilation.typeChecker.isTupleType(argType));
			const typeNode = await context.transpilation.typeChecker.typeToTypeNode(argType, arg);
			const isArrayOrTuple = isArray
				|| Boolean(typeNode && (TsAST.isArrayTypeNode(typeNode) || TsAST.isTupleTypeNode(typeNode)));

			if (isArrayOrTuple) {
				return context.transform(arg, expressionTransformers.value);
			}
		}

		return context.transform(node, [callExpressionTransformer]);
	}

	return context.success({
		result: GoAST.createSelectorExpression({
			target: context.registerSharedDependency(arrayCoalescingDependency.value),
			identifier: arrayCoalescingFunctionIdentifier,
		}),
	});
}

import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import { type BuildContext } from "../../../../context/build";
import { callExpressionTransformer } from "../../../shared";
import { printDependency, printFunctionIdentifier } from "./sharedDependency";

/**
 * `DCommon.print(value)` -> `shard_dependencies.Print(value)`.
 * Refusés : print utilisé comme valeur, second paramètre.
 */
export function printExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): ReturnType<Transformer<GoAST.Expression>["transformer"]> {
	if (TsAST.isCallExpression(node)) {
		return context.transform(node, [callExpressionTransformer]);
	}

	const call = node.parent;

	if (!call || !TsAST.isCallExpression(call) || call.expression !== node) {
		return context.error(node, "common-print-used-as-value");
	}

	if (!call.parent || !TsAST.isExpressionStatement(call.parent)) {
		return context.error(call, "common-print-result-used");
	}

	if (!DArray.lengthEqual(call.arguments, 1)) {
		return context.error(call, "common-print-params-not-supported");
	}

	return context.success({
		result: GoAST.createSelectorExpression({
			target: context.registerSharedDependency(printDependency.value),
			identifier: printFunctionIdentifier,
		}),
	});
}

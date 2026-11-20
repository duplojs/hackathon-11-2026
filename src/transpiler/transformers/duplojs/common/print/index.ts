import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { callExpressionTransformer } from "../../../shared";
import { printDependency, printFunctionIdentifier } from "./sharedDependency";

/**
 * `DCommon.print(x)` → `shard_dependencies.Print(x)`.
 * Même découpage que `success` : l'appel est délégué au transformer d'appel
 * générique, qui revient ici pour la référence à la fonction.
 */
export function printExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (TsAST.isCallExpression(node)) {
		return context.transform(node, [callExpressionTransformer]);
	}

	return context.success({
		result: GoAST.createSelectorExpression({
			target: context.registerSharedDependency(printDependency.value),
			identifier: printFunctionIdentifier,
		}),
	});
}

import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { TypeFlags } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import { type BuildContext } from "../../../../context/build";
import { callExpressionTransformer } from "../../../shared";
import { numberToStringDependency, numberToStringFunctionIdentifier } from "./sharedDependency";

/**
 * `DString.to(value)` → `shard_dependencies.NumberToString(value)` pour un nombre.
 * `DString.to` passé comme valeur (ex. à `map`) → référence à `NumberToString`.
 * Seuls les nombres sont pris en charge : `DString.to` accepte aussi string, boolean,
 * bigint… qui demanderaient chacun leur conversion.
 */
export async function toExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (TsAST.isCallExpression(node)) {
		const argumentNode = DArray.first(node.arguments);
		const argumentType = argumentNode
			&& await context.transpilation.typeChecker.getTypeAtLocation(argumentNode);

		if (!argumentType || !(argumentType.flags & TypeFlags.NumberLike)) {
			return context.error(node, "string-to-supports-only-number");
		}

		return context.transform(node, [callExpressionTransformer]);
	}

	return context.success({
		result: GoAST.createSelectorExpression({
			target: context.registerSharedDependency(numberToStringDependency.value),
			identifier: numberToStringFunctionIdentifier,
		}),
	});
}

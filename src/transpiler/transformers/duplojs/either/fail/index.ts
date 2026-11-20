import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { callExpressionTransformer } from "../../../shared";
import { eitherFailDependency, failFunctionIdentifier, failTypeIdentifier } from "./sharedDependency";

/**
 * `DEither.fail()` → `shard_dependencies.EitherFailOf()`.
 * Même découpage que `success` : l'appel passe par le transformer d'appel,
 * qui revient ici pour la référence à la fonction.
 */
export function failExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (TsAST.isCallExpression(node)) {
		return context.transform(node, [callExpressionTransformer]);
	}

	return context.success({
		result: GoAST.createSelectorExpression({
			target: context.registerSharedDependency(eitherFailDependency.value),
			identifier: failFunctionIdentifier,
		}),
	});
}

/**
 * Type `DEither.Fail` seul → `shard_dependencies.EitherFail`.
 */
export function failTypeHandler(context: BuildContext) {
	return context.success({
		result: GoAST.createPackageTypeReference({
			packageName: context.registerSharedDependency(eitherFailDependency.value),
			identifier: failTypeIdentifier,
		}),
	});
}

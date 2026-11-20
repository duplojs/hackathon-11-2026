import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPattern from "@duplojs/lang/pattern";
import { createTransformer, type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind } from "typescript/async";
import { type BuildContext } from "../../../context/build";
import { coalescingArrayFunctionIdentifier, coalescingDependency, coalescingFunctionIdentifier } from "./sharedDependency";
import { mapExpressionHandler } from "./map";

/**
 * `DArray.coalescing`.
 * - passée par son nom à une autre fonction (whenIsRight, pipe…) : on renvoie la fonction Go,
 *   que `inlineCallback` appelle directement (`Coalescing(valeur)`) ;
 * - appelée directement `DArray.coalescing(x)` : pas encore géré (absent des exercices).
 *
 * En TS, `coalescing` renvoie un tableau tel quel et enveloppe le reste (3 -> [3]).
 * On regarde donc le type de la valeur qu'elle va recevoir (le type « contextuel »
 * donné par whenIsRight / pipe) : tableau -> `CoalescingArray` (renvoie tel quel),
 * sinon -> `Coalescing` (enveloppe). Type inconnu -> erreur plutôt que du Go faux.
 */
async function coalescingExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		const { typeChecker } = context.transpilation;
		const contextualType = await typeChecker.getContextualType(node as TsAST.Expression);
		const [signature] = contextualType
			? await typeChecker.getSignaturesOfType(contextualType, SignatureKind.Call)
			: [];

		if (!signature || signature.parameters.length !== 1) {
			return context.error(node, "array-coalescing-input-type-unknown");
		}

		const inputType = await typeChecker.getParameterType(signature, 0);
		const inputIsArray = await typeChecker.isArrayLikeType(inputType);

		return context.success({
			result: GoAST.createSelectorExpression({
				target: context.registerSharedDependency(coalescingDependency.value),
				identifier: inputIsArray
					? coalescingArrayFunctionIdentifier
					: coalescingFunctionIdentifier,
			}),
		});
	}

	// Appel direct `DArray.coalescing(x)` : absent des exercices, pas encore géré.
	return context.error(node, "array-coalescing-direct-call-not-supported");
}

/** Routeur des fonctions de `@duplojs/lang/array` (coalescing, map…). */
export const duploJSArrayExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		const reference = TsAST.isCallExpression(node)
			? node.expression
			: node;

		if (
			!TsAST.isIdentifier(reference)
			&& !TsAST.isPropertyAccessExpression(reference)
		) {
			return context.notSupport();
		}

		const moduleReference = await DCommon.asyncPipe(
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/array\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("coalescing"),
				() => coalescingExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("map"),
				() => mapExpressionHandler(node, context),
			),
			DPattern.otherwise(
				() => context.error(node, "array-function-not-supported-yet"),
			),
		);
	},
);

import { TsAST } from "@typescript";
import { type GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from ".";

/**
 * `value as T`, `value satisfies T`, `value!` → traduction de `value`.
 * Ces constructions n'existent que pour le typage TypeScript : elles n'ont
 * aucun effet à l'exécution, donc aucune contrepartie en Go.
 * Le type Go de la valeur reste celui de `value` (un `as` qui change la
 * représentation, ex. `x as unknown as string`, n'est pas converti).
 */
export const typeAssertionExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	(node, context) => {
		if (
			!TsAST.isAsExpression(node)
			&& !TsAST.isSatisfiesExpression(node)
			&& !TsAST.isNonNullExpression(node)
		) {
			return context.notSupport();
		}

		return context.transform(node.expression, expressionTransformers.value);
	},
);

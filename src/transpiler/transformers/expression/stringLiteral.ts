import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";

/**
 * `"texte"` / `'texte'` / `` `texte` `` (sans substitution) → `"texte"`.
 * Le printer échappe la valeur. Limite : JS compte en UTF-16, Go en octets UTF-8 ;
 * cela ne compte que pour `.length` ou l'indexation, non traduits.
 */
export const stringLiteralTransformer: Transformer<GoAST.StringLiteral> = createTransformer(
	(node, context) => {
		if (!TsAST.isStringLiteral(node) && !TsAST.isNoSubstitutionTemplateLiteral(node)) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.createStringLiteral({ value: node.text }),
		});
	},
);

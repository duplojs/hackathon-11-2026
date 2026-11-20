import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";

/** `"texte"` -> `"texte"`. Surrogate isolé (ex. "\uD800") : erreur, pas d'UTF-8 possible. */
export const stringLiteralTransformer: Transformer<GoAST.StringLiteral> = createTransformer(
	(node, context) => {
		if (!TsAST.isStringLiteral(node)) {
			return context.notSupport();
		}

		if (!node.text.isWellFormed()) {
			return context.error(node, "string-literal-lone-surrogate-not-supported");
		}

		return context.success({
			result: GoAST.createStringLiteral({ value: node.text }),
		});
	},
);

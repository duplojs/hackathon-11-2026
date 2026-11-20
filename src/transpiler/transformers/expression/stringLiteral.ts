import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";

// Une chaîne Go est une suite d'octets UTF-8, une chaîne JavaScript une suite d'unités UTF-16 :
// le texte est identique, mais une longueur ou un index devra tenir compte de cet écart.
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

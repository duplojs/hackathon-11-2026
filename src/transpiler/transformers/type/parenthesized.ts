import { type GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";

/**
 * `(A | B)` → traduction de `A | B` : les parenthèses n'existent que pour la syntaxe TS.
 */
export const parenthesizedTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	(node, context) => {
		if (!TsAST.isParenthesizedTypeNode(node)) {
			return context.notSupport();
		}

		return context.transform(node.type, typeTransformers.value);
	},
);

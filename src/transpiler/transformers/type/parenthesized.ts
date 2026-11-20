import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";

/** `(A | B)` -> le type Go de `A | B` : les parenthèses disparaissent. */
export const parenthesizedTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	(node, context) => {
		if (!TsAST.isParenthesizedTypeNode(node)) {
			return context.notSupport();
		}

		return context.transform(node.type, typeTransformers.value);
	},
);

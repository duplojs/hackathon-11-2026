import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import type { GoType } from "./checkerType";

export const parenthesizedTypeTransformer: Transformer<GoType> = createTransformer(
	(node, context) => {
		if (!TsAST.isParenthesizedTypeNode(node)) {
			return context.notSupport();
		}

		return context.transform(node.type, typeTransformers.value);
	},
);

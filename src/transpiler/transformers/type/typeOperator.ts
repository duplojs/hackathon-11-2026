import { TsAST } from "@typescript";
import { type Transformer, createTransformer } from "@transformer";
import type { GoAST } from "@go";
import { typeTransformers } from ".";

export const typeOperatorTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async(node, context) => {
		if (
			!TsAST.isTypeOperatorNode(node)
			|| node.operator !== TsAST.SyntaxKind.ReadonlyKeyword
		) {
			return context.notSupport();
		}

		return context.transform(node.type, typeTransformers.value);
	},
);

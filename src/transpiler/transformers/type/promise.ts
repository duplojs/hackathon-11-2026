import { TsAST } from "@typescript";
import { type Transformer, createTransformer } from "@transformer";
import type { GoAST } from "@go";
import { typeTransformers } from ".";

export const promiseTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async(node, context) => {
		if (
			TsAST.isTypeReferenceNode(node)
			&& TsAST.isIdentifier(node.typeName)
			&& node.typeName.text === "Promise"
			&& node.typeArguments?.[0]
		) {
			return context.transform(node.typeArguments[0], typeTransformers.value);
		}

		return context.notSupport();
	},
);

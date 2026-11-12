import { type GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

export const identifierTransformer: Transformer<GoAST.Identifier> = createTransformer(
	(node, context) => {
		if (!TsAST.isIdentifier(node)) {
			return context.notSupport();
		}

		return context.success({
			result: context.createSourceIdentifier(node.text),
		});
	},
);

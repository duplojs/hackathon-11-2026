import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";

export const stringLiteralTransformer: Transformer<GoAST.StringLiteral> = createTransformer(
	(node, context) => {
		if (!TsAST.isStringLiteral(node)) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.createStringLiteral({
				value: node.text,
			}),
		});
	},
);

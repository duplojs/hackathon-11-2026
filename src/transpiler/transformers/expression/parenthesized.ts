import { TsAST } from "@typescript";
import { type GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from ".";

export const parenthesizedExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isParenthesizedExpression(node)) {
			return context.notSupport();
		}

		return context.transform(node.expression, expressionTransformers.value);
	},
);

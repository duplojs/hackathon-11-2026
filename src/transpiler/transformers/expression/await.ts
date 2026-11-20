import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import { expressionTransformers } from ".";

export const awaitExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async (node, context) => {
		if (!TsAST.isAwaitExpression(node)) {
			return context.notSupport();
		}

		return context.transform(node.expression, expressionTransformers.value);
	},
);

import * as DEither from "@duplojs/lang/either";
import type { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { expressionTransformers } from ".";

export const awaitExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isAwaitExpression(node)) {
			return context.notSupport();
		}

		const expression = DEither.unwrapRight(
			await context.transform(node.expression, expressionTransformers.value),
		);

		if (DEither.isLeft(expression)) {
			return expression;
		}

		return context.success({
			before: expression.before,
			result: expression.result,
		});
	},
);

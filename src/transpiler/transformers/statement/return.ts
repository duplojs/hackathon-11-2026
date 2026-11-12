import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from "../expression";

export const returnStatementTransformer: Transformer<GoAST.ReturnStatement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isReturnStatement(node) || !node.expression) {
			return context.notSupport();
		}

		const expression = await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(expression)) {
			return expression;
		}

		return context.success({
			before: expression.before,
			result: GoAST.createReturnStatement({
				values: [expression.result],
			}),
		});
	},
);

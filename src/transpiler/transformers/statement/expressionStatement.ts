import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as GO from "@go";
import * as TS from "typescript/ast";
import { createTransformer, type Transformer } from "../../factory";
import { callExpressionTransformer } from "../expression";

export const expressionStatementTransformer: Transformer<GO.AST.ExpressionStatement> = createTransformer(
	async(node, context) => {
		if (!TS.isExpressionStatement(node)) {
			return context.notSupport(node);
		}

		if (!TS.isCallExpression(node.expression)) {
			return context.notSupport(node);
		}

		const expression = await DCommon.asyncPipe(
			context.transform(node.expression, [callExpressionTransformer]),
			DEither.keepAsRightByInformation("transformation-success"),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(expression)) {
			return expression;
		}

		return context.success({
			...expression,
			result: GO.AST.expressionStatement({ expression: expression.result }),
		});
	},
);

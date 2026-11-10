import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as GO from "@go";
import * as TS from "typescript/ast";
import { createTransformer, type Transformer } from "../../factory";
import { transformExpression } from "../helpers";

export const returnStatementTransformer: Transformer<GO.AST.ReturnStatement> = createTransformer(
	async(node, context, localContext) => {
		if (!TS.isReturnStatement(node)) {
			return context.notSupport(node);
		}

		if (!node.expression) {
			return context.success({ result: GO.AST.returnStatement({ values: [] }) });
		}

		const expression = await DCommon.asyncPipe(
			transformExpression(node.expression, context, localContext),
			DEither.keepAsRightByInformation("transformation-success"),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(expression)) {
			return expression;
		}

		return context.success({
			...expression,
			result: GO.AST.returnStatement({ values: [expression.result] }),
		});
	},
);

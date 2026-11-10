import type * as GO from "@go";
import * as TS from "typescript/ast";
import { createTransformer, type Transformer } from "../../factory";
import { transformExpression } from "../helpers";

export const parenthesizedExpressionTransformer: Transformer<GO.AST.Expression> = createTransformer(
	(node, context, localContext) => {
		if (!TS.isParenthesizedExpression(node)) {
			return context.notSupport(node);
		}

		return transformExpression(node.expression, context, localContext);
	},
);

import { type ExpressionStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printExpressionStatement = createNodePrinter<ExpressionStatement>(
	(node, context) => context.renderNode(node.expression),
);

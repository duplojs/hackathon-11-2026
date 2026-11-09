import { type ExpressionStatement } from "../../AST/statement/expression";
import { createNodePrinter } from "../createNodePrinter";

export const printExpressionStatement = createNodePrinter<ExpressionStatement>(
	(node, context) => context.renderNode(node.expression),
);

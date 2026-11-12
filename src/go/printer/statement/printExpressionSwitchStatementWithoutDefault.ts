import { type ExpressionSwitchStatementWithoutDefault } from "../../AST/statement";
import { createNodePrinter, renderBracedNodes } from "..";
import { renderExpressionSwitchHeader } from "./renderExpressionSwitchHeader";

export const printExpressionSwitchStatementWithoutDefault = createNodePrinter<ExpressionSwitchStatementWithoutDefault>(
	(node, context) => `${renderExpressionSwitchHeader(node.initializer, node.expression, context)} ${renderBracedNodes(node.cases, context)}`,
);

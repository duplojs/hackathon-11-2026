import { type ExpressionSwitchStatementWithoutDefault } from "../../AST/statement/switch";
import { createNodePrinter } from "../createNodePrinter";
import { renderBracedNodes } from "../renderBracedNodes";
import { renderExpressionSwitchHeader } from "./renderExpressionSwitchHeader";

export const printExpressionSwitchStatementWithoutDefault = createNodePrinter<ExpressionSwitchStatementWithoutDefault>(
	(node, context) => `${renderExpressionSwitchHeader(node.initializer, node.expression, context)} ${renderBracedNodes(node.cases, context)}`,
);

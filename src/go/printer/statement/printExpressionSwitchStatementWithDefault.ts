import { type ExpressionSwitchStatementWithDefault } from "../../AST/statement";
import { createNodePrinter, renderBracedNodes } from "..";
import { renderExpressionSwitchHeader } from "./renderExpressionSwitchHeader";

export const printExpressionSwitchStatementWithDefault = createNodePrinter<ExpressionSwitchStatementWithDefault>(
	(node, context) => `${renderExpressionSwitchHeader(node.initializer, node.expression, context)} ${renderBracedNodes([...node.casesBeforeDefault, node.defaultCase, ...node.casesAfterDefault], context)}`,
);

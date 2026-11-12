import { type ExpressionSwitchCase } from "../../AST/statement";
import { createNodePrinter, renderNodeList } from "..";
import { renderCaseBody } from "./renderCaseBody";

export const printExpressionSwitchCase = createNodePrinter<ExpressionSwitchCase>(
	(node, context) => renderCaseBody(`case ${renderNodeList(node.expressions, context)}`, node.statements, context),
);

import { type ExpressionSwitchCase } from "../../AST/statement/switch";
import { createNodePrinter } from "../createNodePrinter";
import { renderNodeList } from "../renderNodeList";
import { renderCaseBody } from "./renderCaseBody";

export const printExpressionSwitchCase = createNodePrinter<ExpressionSwitchCase>(
	(node, context) => renderCaseBody(`case ${renderNodeList(node.expressions, context)}`, node.statements, context),
);

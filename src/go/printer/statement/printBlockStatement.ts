import { type BlockStatement } from "../../AST/statement/block";
import { createNodePrinter } from "../createNodePrinter";
import { renderBracedNodes } from "../renderBracedNodes";

export const printBlockStatement = createNodePrinter<BlockStatement>(
	(node, context) => renderBracedNodes(node.statements, context),
);

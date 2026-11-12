import { type BlockStatement } from "../../AST/statement";
import { createNodePrinter, renderBracedNodes } from "..";

export const printBlockStatement = createNodePrinter<BlockStatement>(
	(node, context) => renderBracedNodes(node.statements, context),
);

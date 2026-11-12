import { type GotoStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printGotoStatement = createNodePrinter<GotoStatement>(
	(node, context) => `goto ${context.renderNode(node.label)}`,
);

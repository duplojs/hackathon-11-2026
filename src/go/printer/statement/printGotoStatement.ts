import { type GotoStatement } from "../../AST/statement/jump";
import { createNodePrinter } from "../createNodePrinter";

export const printGotoStatement = createNodePrinter<GotoStatement>(
	(node, context) => `goto ${context.renderNode(node.label)}`,
);

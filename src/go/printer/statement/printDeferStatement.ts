import { type DeferStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printDeferStatement = createNodePrinter<DeferStatement>(
	(node, context) => `defer ${context.renderNode(node.call)}`,
);

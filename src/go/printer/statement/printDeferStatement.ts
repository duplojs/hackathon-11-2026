import { type DeferStatement } from "../../AST/statement/call";
import { createNodePrinter } from "../createNodePrinter";

export const printDeferStatement = createNodePrinter<DeferStatement>(
	(node, context) => `defer ${context.renderNode(node.call)}`,
);

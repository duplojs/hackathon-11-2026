import { type GoStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printGoStatement = createNodePrinter<GoStatement>(
	(node, context) => `go ${context.renderNode(node.call)}`,
);

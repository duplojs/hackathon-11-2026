import { type GoStatement } from "../../AST/statement/call";
import { createNodePrinter } from "../createNodePrinter";

export const printGoStatement = createNodePrinter<GoStatement>(
	(node, context) => `go ${context.renderNode(node.call)}`,
);

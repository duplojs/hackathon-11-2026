import { type SelectStatementWithoutDefault } from "../../AST/statement";
import { createNodePrinter, renderBracedNodes } from "..";

export const printSelectStatementWithoutDefault = createNodePrinter<SelectStatementWithoutDefault>(
	(node, context) => `select ${renderBracedNodes(node.cases, context)}`,
);

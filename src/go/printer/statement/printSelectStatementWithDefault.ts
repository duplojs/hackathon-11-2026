import { type SelectStatementWithDefault } from "../../AST/statement";
import { createNodePrinter, renderBracedNodes } from "..";

export const printSelectStatementWithDefault = createNodePrinter<SelectStatementWithDefault>(
	(node, context) => `select ${renderBracedNodes([...node.casesBeforeDefault, node.defaultCase, ...node.casesAfterDefault], context)}`,
);

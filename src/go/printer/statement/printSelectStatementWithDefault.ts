import { type SelectStatementWithDefault } from "../../AST/statement/select";
import { createNodePrinter } from "../createNodePrinter";
import { renderBracedNodes } from "../renderBracedNodes";

export const printSelectStatementWithDefault = createNodePrinter<SelectStatementWithDefault>(
	(node, context) => `select ${renderBracedNodes([...node.casesBeforeDefault, node.defaultCase, ...node.casesAfterDefault], context)}`,
);

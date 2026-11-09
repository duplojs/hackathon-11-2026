import { type SelectStatementWithoutDefault } from "../../AST/statement/select";
import { createNodePrinter } from "../createNodePrinter";
import { renderBracedNodes } from "../renderBracedNodes";

export const printSelectStatementWithoutDefault = createNodePrinter<SelectStatementWithoutDefault>(
	(node, context) => `select ${renderBracedNodes(node.cases, context)}`,
);

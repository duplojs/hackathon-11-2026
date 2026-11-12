import { type RuneLiteral } from "../../AST/expression";
import { createNodePrinter, escapeQuotedValue } from "..";

export const printRuneLiteral = createNodePrinter<RuneLiteral>(
	(node) => escapeQuotedValue(node.value, "'"),
);

import { type StringLiteral } from "../../AST/expression";
import { createNodePrinter, escapeQuotedValue } from "..";

export const printStringLiteral = createNodePrinter<StringLiteral>(
	(node) => escapeQuotedValue(node.value, "\"", node.mode),
);

import { type StringLiteral } from "../../AST/expression/literal";
import { createNodePrinter } from "../createNodePrinter";
import { escapeQuotedValue } from "../escapeQuotedValue";

export const printStringLiteral = createNodePrinter<StringLiteral>(
	(node) => escapeQuotedValue(node.value, "\"", node.mode),
);

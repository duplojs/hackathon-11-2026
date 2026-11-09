import { type RuneLiteral } from "../../AST/expression/literal";
import { createNodePrinter } from "../createNodePrinter";
import { escapeQuotedValue } from "../escapeQuotedValue";

export const printRuneLiteral = createNodePrinter<RuneLiteral>(
	(node) => escapeQuotedValue(node.value, "'"),
);

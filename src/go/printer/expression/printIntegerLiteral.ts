import * as DString from "@duplojs/lang/string";
import { type IntegerLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printIntegerLiteral = createNodePrinter<IntegerLiteral>(
	(node) => DString.to(node.value),
);

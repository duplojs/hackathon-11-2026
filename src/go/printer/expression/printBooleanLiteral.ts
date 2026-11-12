import * as DString from "@duplojs/lang/string";
import { type BooleanLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printBooleanLiteral = createNodePrinter<BooleanLiteral>(
	(node) => DString.to(node.value),
);

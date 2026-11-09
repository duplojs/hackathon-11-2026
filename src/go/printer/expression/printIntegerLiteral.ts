import * as DString from "@duplojs/lang/string";
import { type IntegerLiteral } from "../../AST/expression/literal";
import { createNodePrinter } from "../createNodePrinter";

export const printIntegerLiteral = createNodePrinter<IntegerLiteral>(
	(node) => DString.to(node.value),
);

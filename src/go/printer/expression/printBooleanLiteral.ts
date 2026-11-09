import * as DString from "@duplojs/lang/string";
import { type BooleanLiteral } from "../../AST/expression/literal";
import { createNodePrinter } from "../createNodePrinter";

export const printBooleanLiteral = createNodePrinter<BooleanLiteral>(
	(node) => DString.to(node.value),
);

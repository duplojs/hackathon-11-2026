import { type FloatLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printFloatLiteral = createNodePrinter<FloatLiteral>(
	(node) => node.value,
);

import { type FloatLiteral } from "../../AST/expression/literal";
import { createNodePrinter } from "../createNodePrinter";

export const printFloatLiteral = createNodePrinter<FloatLiteral>(
	(node) => node.value,
);

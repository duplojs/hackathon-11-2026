import { type NilLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printNilLiteral = createNodePrinter<NilLiteral>(
	() => "nil",
);

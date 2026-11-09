import { type NilLiteral } from "../../AST/expression/literal";
import { createNodePrinter } from "../createNodePrinter";

export const printNilLiteral = createNodePrinter<NilLiteral>(
	() => "nil",
);

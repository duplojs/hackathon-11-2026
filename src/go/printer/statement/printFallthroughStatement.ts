import { type FallthroughStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printFallthroughStatement = createNodePrinter<FallthroughStatement>(
	() => "fallthrough",
);

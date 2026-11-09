import { type FallthroughStatement } from "../../AST/statement/jump";
import { createNodePrinter } from "../createNodePrinter";

export const printFallthroughStatement = createNodePrinter<FallthroughStatement>(
	() => "fallthrough",
);

import { type Identifier } from "../AST/common";
import { createNodePrinter } from "./createNodePrinter";

export const printIdentifier = createNodePrinter<Identifier>(
	(node) => node.value,
);

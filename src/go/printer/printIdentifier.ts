import { type Identifier } from "../AST/identifier";
import { createNodePrinter } from "./createNodePrinter";

export const printIdentifier = createNodePrinter<Identifier>(
	(node) => node.value,
);

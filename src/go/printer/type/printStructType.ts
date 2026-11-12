import { type StructType } from "../../AST/type";
import { createNodePrinter, renderBracedNodes } from "..";

export const printStructType = createNodePrinter<StructType>(
	(node, context) => `struct ${renderBracedNodes(node.fields, context)}`,
);

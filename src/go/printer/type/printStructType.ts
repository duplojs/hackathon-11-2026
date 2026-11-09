import { type StructType } from "../../AST/type/struct";
import { createNodePrinter } from "../createNodePrinter";
import { renderBracedNodes } from "../renderBracedNodes";

export const printStructType = createNodePrinter<StructType>(
	(node, context) => `struct ${renderBracedNodes(node.fields, context)}`,
);

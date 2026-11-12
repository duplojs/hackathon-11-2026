import { type InterfaceType } from "../../AST/type";
import { createNodePrinter, renderBracedNodes } from "..";

export const printInterfaceType = createNodePrinter<InterfaceType>(
	(node, context) => `interface ${renderBracedNodes(node.elements, context)}`,
);

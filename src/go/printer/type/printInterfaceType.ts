import { type InterfaceType } from "../../AST/type/interface";
import { createNodePrinter } from "../createNodePrinter";
import { renderBracedNodes } from "../renderBracedNodes";

export const printInterfaceType = createNodePrinter<InterfaceType>(
	(node, context) => `interface ${renderBracedNodes(node.elements, context)}`,
);

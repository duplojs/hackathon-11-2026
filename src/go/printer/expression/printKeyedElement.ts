import { type KeyedElement } from "../../AST/expression/composite";
import { createNodePrinter } from "../createNodePrinter";

export const printKeyedElement = createNodePrinter<KeyedElement>(
	(node, context) => `${context.renderNode(node.key)}: ${context.renderNode(node.value)}`,
);

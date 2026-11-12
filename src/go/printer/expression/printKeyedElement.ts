import { type KeyedElement } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printKeyedElement = createNodePrinter<KeyedElement>(
	(node, context) => `${context.renderNode(node.key)}: ${context.renderNode(node.value)}`,
);

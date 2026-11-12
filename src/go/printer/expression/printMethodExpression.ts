import { type MethodExpression } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printMethodExpression = createNodePrinter<MethodExpression>(
	(node, context) => `(${context.renderNode(node.receiverType)}).${context.renderNode(node.identifier)}`,
);

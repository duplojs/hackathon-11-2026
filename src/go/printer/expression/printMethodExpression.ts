import { type MethodExpression } from "../../AST/expression/access";
import { createNodePrinter } from "../createNodePrinter";

export const printMethodExpression = createNodePrinter<MethodExpression>(
	(node, context) => `(${context.renderNode(node.receiverType)}).${context.renderNode(node.identifier)}`,
);

import { type ReceiveExpression } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printReceiveExpression = createNodePrinter<ReceiveExpression>(
	(node, context) => `<-(${context.renderNode(node.operand)})`,
);

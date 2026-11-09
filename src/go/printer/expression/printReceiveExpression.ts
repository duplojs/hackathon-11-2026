import { type ReceiveExpression } from "../../AST/expression/operator";
import { createNodePrinter } from "../createNodePrinter";

export const printReceiveExpression = createNodePrinter<ReceiveExpression>(
	(node, context) => `<-(${context.renderNode(node.operand)})`,
);

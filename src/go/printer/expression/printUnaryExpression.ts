import { type UnaryExpression } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printUnaryExpression = createNodePrinter<UnaryExpression>(
	(node, context) => `${node.operator}(${context.renderNode(node.operand)})`,
);

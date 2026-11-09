import { type UnaryExpression } from "../../AST/expression/operator";
import { createNodePrinter } from "../createNodePrinter";

export const printUnaryExpression = createNodePrinter<UnaryExpression>(
	(node, context) => `${node.operator}(${context.renderNode(node.operand)})`,
);

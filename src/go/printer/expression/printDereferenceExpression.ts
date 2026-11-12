import { type DereferenceExpression } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printDereferenceExpression = createNodePrinter<DereferenceExpression>(
	(node, context) => `*(${context.renderNode(node.operand)})`,
);

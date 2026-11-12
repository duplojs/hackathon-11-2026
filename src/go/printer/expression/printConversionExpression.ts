import { type ConversionExpression } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printConversionExpression = createNodePrinter<ConversionExpression>(
	(node, context) => `(${context.renderNode(node.typeReference)})(${context.renderNode(node.operand)})`,
);

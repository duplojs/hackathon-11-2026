import { type ConversionExpression } from "../../AST/expression/conversion";
import { createNodePrinter } from "../createNodePrinter";

export const printConversionExpression = createNodePrinter<ConversionExpression>(
	(node, context) => `(${context.renderNode(node.typeReference)})(${context.renderNode(node.operand)})`,
);

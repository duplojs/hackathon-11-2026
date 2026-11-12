import { type AddressExpression } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printAddressExpression = createNodePrinter<AddressExpression>(
	(node, context) => `&(${context.renderNode(node.operand)})`,
);

import { type AddressExpression } from "../../AST/expression/operator";
import { createNodePrinter } from "../createNodePrinter";

export const printAddressExpression = createNodePrinter<AddressExpression>(
	(node, context) => `&(${context.renderNode(node.operand)})`,
);

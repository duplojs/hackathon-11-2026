import { type TypeAssertionExpression } from "../../AST/expression/access";
import { createNodePrinter } from "../createNodePrinter";
import { renderOperand } from "./renderOperand";

export const printTypeAssertionExpression = createNodePrinter<TypeAssertionExpression>(
	(node, context) => `${renderOperand(node.target, context, 7)}.(${context.renderNode(node.typeReference)})`,
);

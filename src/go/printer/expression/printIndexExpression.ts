import { type IndexExpression } from "../../AST/expression/access";
import { createNodePrinter } from "../createNodePrinter";
import { renderOperand } from "./renderOperand";

export const printIndexExpression = createNodePrinter<IndexExpression>(
	(node, context) => `${renderOperand(node.target, context, 7)}[${context.renderNode(node.index)}]`,
);

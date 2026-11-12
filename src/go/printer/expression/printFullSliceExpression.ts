import { type FullSliceExpression } from "../../AST/expression";
import { createNodePrinter } from "..";
import { renderOperand } from "./renderOperand";

export const printFullSliceExpression = createNodePrinter<FullSliceExpression>(
	(node, context) => `${renderOperand(node.target, context, 7)}[${node.low ? context.renderNode(node.low) : ""}:${context.renderNode(node.high)}:${context.renderNode(node.max)}]`,
);

import { type SliceExpression } from "../../AST/expression/access";
import { createNodePrinter } from "../createNodePrinter";
import { renderOperand } from "./renderOperand";

export const printSliceExpression = createNodePrinter<SliceExpression>(
	(node, context) => `${renderOperand(node.target, context, 7)}[${node.low ? context.renderNode(node.low) : ""}:${node.high ? context.renderNode(node.high) : ""}]`,
);

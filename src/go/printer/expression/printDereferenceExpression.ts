import { type DereferenceExpression } from "../../AST/expression/operator";
import { createNodePrinter } from "../createNodePrinter";

export const printDereferenceExpression = createNodePrinter<DereferenceExpression>(
	(node, context) => `*(${context.renderNode(node.operand)})`,
);

import { type RangeDeclaration } from "../../AST/statement/for";
import { createNodePrinter } from "../createNodePrinter";

export const printRangeDeclaration = createNodePrinter<RangeDeclaration>(
	(node, context) => `${context.renderNode(node.key)}${node.value ? `, ${context.renderNode(node.value)}` : ""} :=`,
);

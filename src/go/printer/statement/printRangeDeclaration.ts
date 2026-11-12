import { type RangeDeclaration } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printRangeDeclaration = createNodePrinter<RangeDeclaration>(
	(node, context) => `${context.renderNode(node.key)}${node.value ? `, ${context.renderNode(node.value)}` : ""} :=`,
);

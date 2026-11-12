import { type RangeAssignment } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printRangeAssignment = createNodePrinter<RangeAssignment>(
	(node, context) => `${context.renderNode(node.key)}${node.value ? `, ${context.renderNode(node.value)}` : ""} =`,
);

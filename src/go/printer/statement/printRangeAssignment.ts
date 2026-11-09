import { type RangeAssignment } from "../../AST/statement/for";
import { createNodePrinter } from "../createNodePrinter";

export const printRangeAssignment = createNodePrinter<RangeAssignment>(
	(node, context) => `${context.renderNode(node.key)}${node.value ? `, ${context.renderNode(node.value)}` : ""} =`,
);

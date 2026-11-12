import { type SelectReceiveAssignment } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printSelectReceiveAssignment = createNodePrinter<SelectReceiveAssignment>(
	(node, context) => `${context.renderNode(node.value)}${node.ok ? `, ${context.renderNode(node.ok)}` : ""} = ${context.renderNode(node.receive)}`,
);

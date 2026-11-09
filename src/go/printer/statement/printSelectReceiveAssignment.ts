import { type SelectReceiveAssignment } from "../../AST/statement/select";
import { createNodePrinter } from "../createNodePrinter";

export const printSelectReceiveAssignment = createNodePrinter<SelectReceiveAssignment>(
	(node, context) => `${context.renderNode(node.value)}${node.ok ? `, ${context.renderNode(node.ok)}` : ""} = ${context.renderNode(node.receive)}`,
);

import { type SelectReceiveDeclaration } from "../../AST/statement/select";
import { createNodePrinter } from "../createNodePrinter";

export const printSelectReceiveDeclaration = createNodePrinter<SelectReceiveDeclaration>(
	(node, context) => `${context.renderNode(node.value)}${node.ok ? `, ${context.renderNode(node.ok)}` : ""} := ${context.renderNode(node.receive)}`,
);

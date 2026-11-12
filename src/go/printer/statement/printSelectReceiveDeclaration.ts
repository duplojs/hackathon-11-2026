import { type SelectReceiveDeclaration } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printSelectReceiveDeclaration = createNodePrinter<SelectReceiveDeclaration>(
	(node, context) => `${context.renderNode(node.value)}${node.ok ? `, ${context.renderNode(node.ok)}` : ""} := ${context.renderNode(node.receive)}`,
);

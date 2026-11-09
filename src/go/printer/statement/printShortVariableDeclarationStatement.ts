import { type ShortVariableDeclarationStatement } from "../../AST/statement/assignment";
import { createNodePrinter } from "../createNodePrinter";

export const printShortVariableDeclarationStatement = createNodePrinter<ShortVariableDeclarationStatement>(
	(node, context) => `${context.renderNode(node.identifier)} := ${context.renderNode(node.initializer)}`,
);

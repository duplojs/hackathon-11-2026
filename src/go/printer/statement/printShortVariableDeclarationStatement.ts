import { type ShortVariableDeclarationStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printShortVariableDeclarationStatement = createNodePrinter<ShortVariableDeclarationStatement>(
	(node, context) => `${context.renderNode(node.identifier)} := ${context.renderNode(node.initializer)}`,
);

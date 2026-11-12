import { type VariableDeclarationZeroValue } from "../../AST/common";
import { createNodePrinter } from "..";

export const printVariableDeclarationZeroValue = createNodePrinter<VariableDeclarationZeroValue>(
	(node, context) => `var ${context.renderNode(node.identifier)} ${context.renderNode(node.typeReference)}`,
);

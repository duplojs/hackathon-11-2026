import { type VariableDeclarationZeroValue } from "../../AST/declaration/variable";
import { createNodePrinter } from "../createNodePrinter";

export const printVariableDeclarationZeroValue = createNodePrinter<VariableDeclarationZeroValue>(
	(node, context) => `var ${context.renderNode(node.identifier)} ${context.renderNode(node.typeReference)}`,
);

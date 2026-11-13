import { type TypeParameter } from "../../AST/type";
import { createNodePrinter } from "..";

export const printTypeParameter = createNodePrinter<TypeParameter>(
	(node, context) => `${context.renderNode(node.identifier)} ${context.renderNode(node.constraint)}`,
);

import { type PointerType } from "../../AST/type";
import { createNodePrinter } from "..";

export const printPointerType = createNodePrinter<PointerType>(
	(node, context) => `*${context.renderNode(node.typeReference)}`,
);

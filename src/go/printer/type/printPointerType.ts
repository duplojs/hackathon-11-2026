import { type PointerType } from "../../AST/type/pointer";
import { createNodePrinter } from "../createNodePrinter";

export const printPointerType = createNodePrinter<PointerType>(
	(node, context) => `*${context.renderNode(node.typeReference)}`,
);

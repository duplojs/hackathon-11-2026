import { type SliceType } from "../../AST/type";
import { createNodePrinter } from "..";

export const printSliceType = createNodePrinter<SliceType>(
	(node, context) => `[]${context.renderNode(node.elementType)}`,
);

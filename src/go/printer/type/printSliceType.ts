import { type SliceType } from "../../AST/type/slice";
import { createNodePrinter } from "../createNodePrinter";

export const printSliceType = createNodePrinter<SliceType>(
	(node, context) => `[]${context.renderNode(node.elementType)}`,
);

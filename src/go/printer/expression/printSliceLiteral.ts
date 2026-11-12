import { type SliceLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";
import { renderCompositeElements } from "./renderCompositeElements";

export const printSliceLiteral = createNodePrinter<SliceLiteral>(
	(node, context) => `(${context.renderNode(node.typeReference)}${renderCompositeElements(node.elements, context)})`,
);

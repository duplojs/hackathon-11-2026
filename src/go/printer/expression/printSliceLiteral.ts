import { type SliceLiteral } from "../../AST/expression/composite";
import { createNodePrinter } from "../createNodePrinter";
import { renderCompositeElements } from "./renderCompositeElements";

export const printSliceLiteral = createNodePrinter<SliceLiteral>(
	(node, context) => `(${context.renderNode(node.typeReference)}${renderCompositeElements(node.elements, context)})`,
);

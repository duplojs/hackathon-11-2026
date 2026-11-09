import { type StructLiteral } from "../../AST/expression/composite";
import { createNodePrinter } from "../createNodePrinter";
import { renderCompositeElements } from "./renderCompositeElements";

export const printStructLiteral = createNodePrinter<StructLiteral>(
	(node, context) => `(${context.renderNode(node.typeReference)}${renderCompositeElements(node.elements, context)})`,
);

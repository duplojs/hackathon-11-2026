import { type StructLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";
import { renderCompositeElements } from "./renderCompositeElements";

export const printStructLiteral = createNodePrinter<StructLiteral>(
	(node, context) => `(${context.renderNode(node.typeReference)}${renderCompositeElements(node.elements, context)})`,
);

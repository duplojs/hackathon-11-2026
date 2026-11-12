import { type ArrayLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";
import { renderCompositeElements } from "./renderCompositeElements";

export const printArrayLiteral = createNodePrinter<ArrayLiteral>(
	(node, context) => `(${context.renderNode(node.typeReference)}${renderCompositeElements(node.elements, context)})`,
);

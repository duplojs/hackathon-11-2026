import { type ArrayLiteral } from "../../AST/expression/composite";
import { createNodePrinter } from "../createNodePrinter";
import { renderCompositeElements } from "./renderCompositeElements";

export const printArrayLiteral = createNodePrinter<ArrayLiteral>(
	(node, context) => `(${context.renderNode(node.typeReference)}${renderCompositeElements(node.elements, context)})`,
);

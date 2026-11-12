import { type MapLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";
import { renderCompositeElements } from "./renderCompositeElements";

export const printMapLiteral = createNodePrinter<MapLiteral>(
	(node, context) => `(${context.renderNode(node.typeReference)}${renderCompositeElements(node.elements, context)})`,
);

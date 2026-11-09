import { type MapLiteral } from "../../AST/expression/composite";
import { createNodePrinter } from "../createNodePrinter";
import { renderCompositeElements } from "./renderCompositeElements";

export const printMapLiteral = createNodePrinter<MapLiteral>(
	(node, context) => `(${context.renderNode(node.typeReference)}${renderCompositeElements(node.elements, context)})`,
);

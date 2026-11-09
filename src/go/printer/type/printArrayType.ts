import { type ArrayType } from "../../AST/type/array";
import { createNodePrinter } from "../createNodePrinter";

export const printArrayType = createNodePrinter<ArrayType>(
	(node, context) => `[${context.renderNode(node.length)}]${context.renderNode(node.elementType)}`,
);

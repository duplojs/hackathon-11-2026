import { type ArrayType } from "../../AST/type";
import { createNodePrinter } from "..";

export const printArrayType = createNodePrinter<ArrayType>(
	(node, context) => `[${context.renderNode(node.length)}]${context.renderNode(node.elementType)}`,
);

import { type MapType } from "../../AST/type";
import { createNodePrinter } from "..";

export const printMapType = createNodePrinter<MapType>(
	(node, context) => `map[${context.renderNode(node.keyType)}]${context.renderNode(node.valueType)}`,
);

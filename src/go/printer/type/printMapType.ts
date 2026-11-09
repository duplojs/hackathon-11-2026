import { type MapType } from "../../AST/type/map";
import { createNodePrinter } from "../createNodePrinter";

export const printMapType = createNodePrinter<MapType>(
	(node, context) => `map[${context.renderNode(node.keyType)}]${context.renderNode(node.valueType)}`,
);

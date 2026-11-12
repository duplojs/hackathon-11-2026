import { type Node } from "../AST";
import { type PrinterContext } from "./context";

export function createNodePrinter<GenericNode extends Node>(
	printer: (node: GenericNode, context: PrinterContext) => string,
) {
	return (context: PrinterContext) => (node: GenericNode) => printer(node, context);
}

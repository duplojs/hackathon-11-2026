import * as DArray from "@duplojs/lang/array";
import * as DPrinter from "@duplojs/lang/printer";
import { type Node } from "../AST";
import { type PrinterContext } from "./context";

export function renderNodeLines(
	nodes: readonly Node[],
	context: PrinterContext,
	depth = context.depth,
) {
	return DPrinter.renderParagraph(
		DArray.map(nodes, (node) => context.renderNode(node, 0)),
		{
			indent: DPrinter.Indent.tab,
			indentLevel: depth,
		},
	);
}

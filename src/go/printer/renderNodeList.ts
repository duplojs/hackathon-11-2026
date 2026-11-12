import * as DArray from "@duplojs/lang/array";
import * as DPrinter from "@duplojs/lang/printer";
import { type Node } from "../AST";
import { type PrinterContext } from "./context";

export function renderNodeList(
	nodes: readonly Node[],
	context: PrinterContext,
	separator = ", ",
) {
	return DPrinter.renderLine(
		DArray.map(nodes, (node) => context.renderNode(node)),
		{ joinCharacter: separator },
	);
}

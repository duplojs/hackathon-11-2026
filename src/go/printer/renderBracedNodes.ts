import * as DPrinter from "@duplojs/lang/printer";
import { type Node } from "../AST/base";
import { type PrinterContext } from "./context";
import { renderNodeLines } from "./renderNodeLines";

export function renderBracedNodes(nodes: readonly Node[], context: PrinterContext) {
	return nodes.length === 0
		? "{}"
		: DPrinter.renderParagraph([
			"{",
			renderNodeLines(nodes, context, context.depth + 1),
			`${context.indentation}}`,
		]);
}

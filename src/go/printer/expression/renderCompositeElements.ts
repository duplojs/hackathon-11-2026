import * as DArray from "@duplojs/lang/array";
import * as DPrinter from "@duplojs/lang/printer";
import { type Node } from "../../AST";
import { type PrinterContext } from "..";

export function renderCompositeElements(elements: readonly Node[], context: PrinterContext) {
	return elements.length === 0
		? "{}"
		: DPrinter.renderParagraph([
			"{",
			DPrinter.renderParagraph(
				DArray.map(elements, (element) => `${context.renderNode(element, 0)},`),
				{
					indent: DPrinter.Indent.tab,
					indentLevel: context.depth + 1,
				},
			),
			`${context.indentation}}`,
		]);
}

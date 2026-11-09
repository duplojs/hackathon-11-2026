import * as DPrinter from "@duplojs/lang/printer";
import { type PrinterContext } from "./context";

export function createPrinterContext(
	depth: number,
	renderNode: PrinterContext["renderNode"],
) {
	return {
		depth,
		indentation: DPrinter.renderLine([""], {
			indent: DPrinter.Indent.tab,
			indentLevel: depth,
		}),
		renderNode,
	};
}

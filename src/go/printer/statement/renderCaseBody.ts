import * as DPrinter from "@duplojs/lang/printer";
import { type Statement } from "../../AST/statement";
import { type PrinterContext, renderNodeLines } from "..";

export function renderCaseBody(header: string, statements: readonly Statement[], context: PrinterContext) {
	return DPrinter.renderParagraph([
		`${header}:`,
		statements.length > 0 && renderNodeLines(statements, context, context.depth + 1),
	]);
}

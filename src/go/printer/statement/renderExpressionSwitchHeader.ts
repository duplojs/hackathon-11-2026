import * as DPrinter from "@duplojs/lang/printer";
import { type Expression } from "../../AST/expression";
import { type SimpleStatement } from "../../AST/statement";
import { type PrinterContext } from "..";

export function renderExpressionSwitchHeader(
	initializer: SimpleStatement | undefined,
	expression: Expression | undefined,
	context: PrinterContext,
) {
	return DPrinter.renderLine([
		"switch",
		initializer && `${context.renderNode(initializer)};`,
		expression && context.renderNode(expression),
	]);
}

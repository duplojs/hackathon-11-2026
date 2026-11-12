import * as DPrinter from "@duplojs/lang/printer";
import { type Expression } from "../../AST/expression";
import { type Identifier } from "../../AST/common";
import { type SimpleStatement } from "../../AST/statement";
import { type PrinterContext } from "..";
import { renderOperand } from "../expression";

export function renderTypeSwitchHeader(
	initializer: SimpleStatement | undefined,
	identifier: Identifier | undefined,
	expression: Expression,
	context: PrinterContext,
) {
	return DPrinter.renderLine([
		"switch",
		initializer && `${context.renderNode(initializer)};`,
		identifier && `${context.renderNode(identifier)} :=`,
		`${renderOperand(expression, context, 7)}.(type)`,
	]);
}

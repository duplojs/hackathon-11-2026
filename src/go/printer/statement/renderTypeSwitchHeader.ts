import * as DPrinter from "@duplojs/lang/printer";
import { type Expression } from "../../AST/expression/base";
import { type Identifier } from "../../AST/identifier";
import { type SimpleStatement } from "../../AST/statement/base";
import { type PrinterContext } from "../context";
import { renderOperand } from "../expression/renderOperand";

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

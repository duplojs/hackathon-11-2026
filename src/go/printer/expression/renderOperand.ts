import { type Expression } from "../../AST/expression";
import { type PrinterContext } from "..";
import { getExpressionPrecedence } from "./getExpressionPrecedence";

export function renderOperand(node: Expression, context: PrinterContext, minimumPrecedence: number) {
	const text = context.renderNode(node);
	const precedence = getExpressionPrecedence(node, text);
	return precedence < minimumPrecedence ? `(${text})` : text;
}

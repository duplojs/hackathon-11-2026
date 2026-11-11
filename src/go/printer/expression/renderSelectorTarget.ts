import * as DModeling from "@duplojs/lang/modeling";
import { type Expression } from "../../AST/expression/base";
import { type PrinterContext } from "../context";
import { renderOperand } from "./renderOperand";

export function renderSelectorTarget(node: Expression, context: PrinterContext) {
	// Sans parenthèses, 1.M est lu comme le flottant 1. suivi de M.
	return DModeling.hasTagValue(node, [
		"[node][expression]:literal-integer",
		"[node][expression]:literal-float",
		"[node][expression]:literal-imaginary",
	])
		? `(${context.renderNode(node)})`
		: renderOperand(node, context, 7);
}

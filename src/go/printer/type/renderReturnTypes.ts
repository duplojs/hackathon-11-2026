import { type FunctionReturnType } from "../../AST/type/function";
import { type PrinterContext } from "../context";
import { renderNodeList } from "../renderNodeList";

export function renderReturnTypes(types: readonly FunctionReturnType[], context: PrinterContext) {
	return types.length === 0 ? "" : ` (${renderNodeList(types, context)})`;
}

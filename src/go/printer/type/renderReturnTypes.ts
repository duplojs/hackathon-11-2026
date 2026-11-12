import { type FunctionReturnType } from "../../AST/type";
import { type PrinterContext, renderNodeList } from "..";

export function renderReturnTypes(types: readonly FunctionReturnType[], context: PrinterContext) {
	return types.length === 0 ? "" : ` (${renderNodeList(types, context)})`;
}

import { type TypeParameter } from "../../AST/type";
import { type PrinterContext, renderNodeList } from "..";

export function renderTypeParameters(parameters: readonly TypeParameter[], context: PrinterContext) {
	// La virgule finale distingue notamment [T *C,] d'une longueur de tableau.
	return parameters.length === 0
		? ""
		: `[${renderNodeList(parameters, context)},]`;
}

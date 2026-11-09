import * as DArray from "@duplojs/lang/array";
import * as DPrinter from "@duplojs/lang/printer";
import { type TypeParameter } from "../../AST/type/function";
import { type PrinterContext } from "../context";

export function renderTypeParameters(parameters: readonly TypeParameter[], context: PrinterContext) {
	// La virgule finale distingue notamment [T *C,] d'une longueur de tableau.
	return parameters.length === 0
		? ""
		: `[${DPrinter.renderLine(
			DArray.map(parameters, ([identifier, constraint]) => (
				`${context.renderNode(identifier)} ${context.renderNode(constraint)}`
			)),
			{ joinCharacter: ", " },
		)},]`;
}

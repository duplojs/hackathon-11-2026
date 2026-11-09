import * as DArray from "@duplojs/lang/array";
import * as DPrinter from "@duplojs/lang/printer";
import { type FunctionParameter } from "../../AST/type/function";
import { type PrinterContext } from "../context";

export function renderParameters(
	parameters: readonly FunctionParameter[],
	variadicParameter: FunctionParameter | undefined,
	context: PrinterContext,
) {
	const ordinary = DArray.map(parameters, ([identifier, typeReference]) => (
		`${context.renderNode(identifier)} ${context.renderNode(typeReference)}`
	));
	const variadic = variadicParameter
		? [`${context.renderNode(variadicParameter[0])} ...${context.renderNode(variadicParameter[1])}`]
		: [];
	return `(${DPrinter.renderLine([...ordinary, ...variadic], { joinCharacter: ", " })})`;
}

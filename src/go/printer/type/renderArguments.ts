import * as DArray from "@duplojs/lang/array";
import * as DPrinter from "@duplojs/lang/printer";
import { type FunctionArgument } from "../../AST/common";
import { type PrinterContext } from "..";

export function renderArguments(
	functionArguments: readonly FunctionArgument[],
	variadicArgument: FunctionArgument | undefined,
	context: PrinterContext,
) {
	const ordinary = DArray.map(functionArguments, (argument) => context.renderNode(argument));
	const variadic = variadicArgument
		? [`${context.renderNode(variadicArgument.identifier)} ...${context.renderNode(variadicArgument.type)}`]
		: [];
	return `(${DPrinter.renderLine([...ordinary, ...variadic], { joinCharacter: ", " })})`;
}

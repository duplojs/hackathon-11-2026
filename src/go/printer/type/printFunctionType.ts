import { type FunctionType } from "../../AST/type/function";
import { createNodePrinter } from "../createNodePrinter";
import { renderParameters } from "./renderParameters";
import { renderReturnTypes } from "./renderReturnTypes";

export const printFunctionType = createNodePrinter<FunctionType>(
	(node, context) => `func${renderParameters(node.parameters, node.variadicParameter, context)}${renderReturnTypes(node.returnTypes, context)}`,
);

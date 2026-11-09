import { type FunctionLiteral } from "../../AST/expression/function";
import { createNodePrinter } from "../createNodePrinter";
import { renderParameters } from "../type/renderParameters";
import { renderReturnTypes } from "../type/renderReturnTypes";

export const printFunctionLiteral = createNodePrinter<FunctionLiteral>(
	(node, context) => `func${renderParameters(node.parameters, node.variadicParameter, context)}${renderReturnTypes(node.returnTypes, context)} ${context.renderNode(node.body)}`,
);

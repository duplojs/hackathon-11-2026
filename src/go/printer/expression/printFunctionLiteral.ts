import { type FunctionLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";
import { renderParameters, renderReturnTypes } from "../type";

export const printFunctionLiteral = createNodePrinter<FunctionLiteral>(
	(node, context) => `func${renderParameters(node.parameters, node.variadicParameter, context)}${renderReturnTypes(node.returnTypes, context)} ${context.renderNode(node.body)}`,
);

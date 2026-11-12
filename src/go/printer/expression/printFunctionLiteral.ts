import { type FunctionLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";
import { renderArguments, renderReturnTypes } from "../type";

export const printFunctionLiteral = createNodePrinter<FunctionLiteral>(
	(node, context) => `func${renderArguments(node.arguments, node.variadicArgument, context)}${renderReturnTypes(node.returnTypes, context)} ${context.renderNode(node.body)}`,
);

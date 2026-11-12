import { type FunctionDeclaration } from "../../AST/declaration";
import { createNodePrinter } from "..";
import { renderArguments, renderReturnTypes, renderTypeParameters } from "../type";

export const printFunctionDeclaration = createNodePrinter<FunctionDeclaration>(
	(node, context) => `func ${context.renderNode(node.identifier)}${renderTypeParameters(node.generic, context)}${renderArguments(node.arguments, node.variadicArgument, context)}${renderReturnTypes(node.returnTypes, context)} ${context.renderNode(node.body)}`,
);

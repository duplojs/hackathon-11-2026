import { type FunctionDeclaration } from "../../AST/declaration";
import { createNodePrinter } from "..";
import { renderParameters, renderReturnTypes, renderTypeParameters } from "../type";

export const printFunctionDeclaration = createNodePrinter<FunctionDeclaration>(
	(node, context) => `func ${context.renderNode(node.identifier)}${renderTypeParameters(node.generic, context)}${renderParameters(node.parameters, node.variadicParameter, context)}${renderReturnTypes(node.returnTypes, context)} ${context.renderNode(node.body)}`,
);

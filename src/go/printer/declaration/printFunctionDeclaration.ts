import { type FunctionDeclaration } from "../../AST/declaration/function";
import { createNodePrinter } from "../createNodePrinter";
import { renderParameters } from "../type/renderParameters";
import { renderReturnTypes } from "../type/renderReturnTypes";
import { renderTypeParameters } from "../type/renderTypeParameters";

export const printFunctionDeclaration = createNodePrinter<FunctionDeclaration>(
	(node, context) => `func ${context.renderNode(node.identifier)}${renderTypeParameters(node.generic, context)}${renderParameters(node.parameters, node.variadicParameter, context)}${renderReturnTypes(node.returnTypes, context)} ${context.renderNode(node.body)}`,
);

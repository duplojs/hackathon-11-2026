import { type MethodDeclaration } from "../../AST/declaration/function";
import { createNodePrinter } from "../createNodePrinter";
import { renderParameters } from "../type/renderParameters";
import { renderReturnTypes } from "../type/renderReturnTypes";
import { renderTypeParameters } from "../type/renderTypeParameters";

export const printMethodDeclaration = createNodePrinter<MethodDeclaration>(
	(node, context) => `func (${context.renderNode(node.receiver[0])} ${context.renderNode(node.receiver[1])}) ${context.renderNode(node.identifier)}${renderTypeParameters(node.generic, context)}${renderParameters(node.parameters, node.variadicParameter, context)}${renderReturnTypes(node.returnTypes, context)} ${context.renderNode(node.body)}`,
);

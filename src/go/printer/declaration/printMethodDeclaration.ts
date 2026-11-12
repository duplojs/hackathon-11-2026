import { type MethodDeclaration } from "../../AST/declaration";
import { createNodePrinter } from "..";
import { renderArguments, renderReturnTypes, renderTypeParameters } from "../type";

export const printMethodDeclaration = createNodePrinter<MethodDeclaration>(
	(node, context) => `func (${context.renderNode(node.receiver[0])} ${context.renderNode(node.receiver[1])}) ${context.renderNode(node.identifier)}${renderTypeParameters(node.generic, context)}${renderArguments(node.arguments, node.variadicArgument, context)}${renderReturnTypes(node.returnTypes, context)} ${context.renderNode(node.body)}`,
);

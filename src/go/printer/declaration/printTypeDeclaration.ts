import { type TypeDeclaration } from "../../AST/shared";
import { createNodePrinter } from "..";
import { renderTypeParameters } from "../type";

export const printTypeDeclaration = createNodePrinter<TypeDeclaration>(
	(node, context) => `type ${context.renderNode(node.identifier)}${renderTypeParameters(node.generic ?? [], context)} ${context.renderNode(node.type)}`,
);

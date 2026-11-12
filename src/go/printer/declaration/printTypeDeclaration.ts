import { type TypeDeclaration } from "../../AST/common";
import { createNodePrinter } from "..";
import { renderTypeParameters } from "../type";

export const printTypeDeclaration = createNodePrinter<TypeDeclaration>(
	(node, context) => `type ${context.renderNode(node.identifier)}${renderTypeParameters(node.generic ?? [], context)} ${context.renderNode(node.type)}`,
);

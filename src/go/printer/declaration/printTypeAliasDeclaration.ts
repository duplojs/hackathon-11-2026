import { type TypeAliasDeclaration } from "../../AST/declaration/type";
import { createNodePrinter } from "../createNodePrinter";
import { renderTypeParameters } from "../type/renderTypeParameters";

export const printTypeAliasDeclaration = createNodePrinter<TypeAliasDeclaration>(
	(node, context) => `type ${context.renderNode(node.identifier)}${renderTypeParameters(node.generic ?? [], context)} = ${context.renderNode(node.type)}`,
);

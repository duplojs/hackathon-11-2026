import { type GenericTypeReference } from "../../AST/common";
import { createNodePrinter, renderNodeList } from "..";

export const printGenericTypeReference = createNodePrinter<GenericTypeReference>(
	(node, context) => `${context.renderNode(node.typeReference)}[${renderNodeList(node.typeArguments, context)}]`,
);

import { type GenericTypeReference } from "../../AST/type/reference";
import { createNodePrinter } from "../createNodePrinter";
import { renderNodeList } from "../renderNodeList";

export const printGenericTypeReference = createNodePrinter<GenericTypeReference>(
	(node, context) => `${context.renderNode(node.typeReference)}[${renderNodeList(node.typeArguments, context)}]`,
);

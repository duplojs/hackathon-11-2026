import { type InterfaceUnion } from "../../AST/type/interface";
import { createNodePrinter } from "../createNodePrinter";
import { renderNodeList } from "../renderNodeList";

export const printInterfaceUnion = createNodePrinter<InterfaceUnion>(
	(node, context) => renderNodeList(node.terms, context, " | "),
);

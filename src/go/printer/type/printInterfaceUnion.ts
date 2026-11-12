import { type InterfaceUnion } from "../../AST/type";
import { createNodePrinter, renderNodeList } from "..";

export const printInterfaceUnion = createNodePrinter<InterfaceUnion>(
	(node, context) => renderNodeList(node.terms, context, " | "),
);

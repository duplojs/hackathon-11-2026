import { type InterfaceMethod } from "../../AST/type";
import { createNodePrinter } from "..";
import { renderArguments } from "./renderArguments";
import { renderReturnTypes } from "./renderReturnTypes";

export const printInterfaceMethod = createNodePrinter<InterfaceMethod>(
	(node, context) => `${context.renderNode(node.identifier)}${renderArguments(node.arguments, node.variadicArgument, context)}${renderReturnTypes(node.returnTypes, context)}`,
);

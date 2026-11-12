import { type InterfaceMethod } from "../../AST/type";
import { createNodePrinter } from "..";
import { renderParameters } from "./renderParameters";
import { renderReturnTypes } from "./renderReturnTypes";

export const printInterfaceMethod = createNodePrinter<InterfaceMethod>(
	(node, context) => `${context.renderNode(node.identifier)}${renderParameters(node.parameters, node.variadicParameter, context)}${renderReturnTypes(node.returnTypes, context)}`,
);

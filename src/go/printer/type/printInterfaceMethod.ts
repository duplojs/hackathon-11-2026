import { type InterfaceMethod } from "../../AST/type/interface";
import { createNodePrinter } from "../createNodePrinter";
import { renderParameters } from "./renderParameters";
import { renderReturnTypes } from "./renderReturnTypes";

export const printInterfaceMethod = createNodePrinter<InterfaceMethod>(
	(node, context) => `${context.renderNode(node.identifier)}${renderParameters(node.parameters, node.variadicParameter, context)}${renderReturnTypes(node.returnTypes, context)}`,
);

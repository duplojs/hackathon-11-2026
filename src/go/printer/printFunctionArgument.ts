import { type FunctionArgument } from "../AST/common";
import { createNodePrinter } from "./createNodePrinter";

export const printFunctionArgument = createNodePrinter<FunctionArgument>(
	(node, context) => `${context.renderNode(node.identifier)} ${context.renderNode(node.type)}`,
);

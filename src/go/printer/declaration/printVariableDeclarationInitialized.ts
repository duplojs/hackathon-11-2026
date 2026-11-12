import * as DPrinter from "@duplojs/lang/printer";
import { type VariableDeclarationInitialized } from "../../AST/common";
import { createNodePrinter } from "..";

export const printVariableDeclarationInitialized = createNodePrinter<VariableDeclarationInitialized>(
	(node, context) => DPrinter.renderLine([
		"var",
		context.renderNode(node.identifier),
		node.typeReference && context.renderNode(node.typeReference),
		"=",
		context.renderNode(node.initializer),
	]),
);

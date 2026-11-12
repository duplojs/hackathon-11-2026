import * as DPrinter from "@duplojs/lang/printer";
import { type ConstantDeclaration } from "../../AST/shared";
import { createNodePrinter } from "..";

export const printConstantDeclaration = createNodePrinter<ConstantDeclaration>(
	(node, context) => DPrinter.renderLine([
		"const",
		context.renderNode(node.identifier),
		node.typeReference && context.renderNode(node.typeReference),
		"=",
		context.renderNode(node.initializer),
	]),
);

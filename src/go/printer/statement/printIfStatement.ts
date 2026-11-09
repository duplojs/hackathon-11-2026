import * as DPrinter from "@duplojs/lang/printer";
import { type IfStatement } from "../../AST/statement/if";
import { createNodePrinter } from "../createNodePrinter";

export const printIfStatement = createNodePrinter<IfStatement>(
	(node, context) => DPrinter.renderLine([
		"if",
		node.initializer && `${context.renderNode(node.initializer)};`,
		context.renderNode(node.condition),
		context.renderNode(node.body),
		node.elseBranch && `else ${context.renderNode(node.elseBranch)}`,
	]),
);

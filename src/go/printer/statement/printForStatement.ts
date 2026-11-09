import * as DPrinter from "@duplojs/lang/printer";
import { type ForStatement } from "../../AST/statement/for";
import { createNodePrinter } from "../createNodePrinter";

export const printForStatement = createNodePrinter<ForStatement>(
	(node, context) => {
		const header = node.initializer || node.post
			? `${node.initializer ? context.renderNode(node.initializer) : ""}; ${node.condition ? context.renderNode(node.condition) : ""}; ${node.post ? context.renderNode(node.post) : ""}`
			: node.condition && context.renderNode(node.condition);
		return DPrinter.renderLine(["for", header, context.renderNode(node.body)]);
	},
);

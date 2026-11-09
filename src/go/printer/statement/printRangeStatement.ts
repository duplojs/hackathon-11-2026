import * as DPrinter from "@duplojs/lang/printer";
import { type RangeStatement } from "../../AST/statement/for";
import { createNodePrinter } from "../createNodePrinter";

export const printRangeStatement = createNodePrinter<RangeStatement>(
	(node, context) => DPrinter.renderLine([
		"for",
		node.binding && context.renderNode(node.binding),
		"range",
		context.renderNode(node.expression),
		context.renderNode(node.body),
	]),
);

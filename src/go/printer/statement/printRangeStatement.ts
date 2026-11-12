import * as DPrinter from "@duplojs/lang/printer";
import { type RangeStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printRangeStatement = createNodePrinter<RangeStatement>(
	(node, context) => DPrinter.renderLine([
		"for",
		node.binding && context.renderNode(node.binding),
		"range",
		context.renderNode(node.expression),
		context.renderNode(node.body),
	]),
);

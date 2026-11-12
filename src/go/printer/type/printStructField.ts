import * as DPrinter from "@duplojs/lang/printer";
import { type StructField } from "../../AST/type";
import { createNodePrinter, escapeQuotedValue } from "..";

export const printStructField = createNodePrinter<StructField>(
	(node, context) => DPrinter.renderLine([
		context.renderNode(node.identifier),
		context.renderNode(node.typeReference),
		node.tag !== undefined && escapeQuotedValue(node.tag),
	]),
);

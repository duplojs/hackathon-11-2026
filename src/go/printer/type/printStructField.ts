import * as DPrinter from "@duplojs/lang/printer";
import { type StructField } from "../../AST/type/struct";
import { createNodePrinter } from "../createNodePrinter";
import { escapeQuotedValue } from "../escapeQuotedValue";

export const printStructField = createNodePrinter<StructField>(
	(node, context) => DPrinter.renderLine([
		context.renderNode(node.identifier),
		context.renderNode(node.typeReference),
		node.tag !== undefined && escapeQuotedValue(node.tag),
	]),
);

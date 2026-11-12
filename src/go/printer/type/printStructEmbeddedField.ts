import * as DPrinter from "@duplojs/lang/printer";
import { type StructEmbeddedField } from "../../AST/type";
import { createNodePrinter, escapeQuotedValue } from "..";

export const printStructEmbeddedField = createNodePrinter<StructEmbeddedField>(
	(node, context) => DPrinter.renderLine([
		context.renderNode(node.typeReference),
		node.tag !== undefined && escapeQuotedValue(node.tag),
	]),
);

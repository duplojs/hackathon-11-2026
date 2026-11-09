import * as DPrinter from "@duplojs/lang/printer";
import { type StructEmbeddedField } from "../../AST/type/struct";
import { createNodePrinter } from "../createNodePrinter";
import { escapeQuotedValue } from "../escapeQuotedValue";

export const printStructEmbeddedField = createNodePrinter<StructEmbeddedField>(
	(node, context) => DPrinter.renderLine([
		context.renderNode(node.typeReference),
		node.tag !== undefined && escapeQuotedValue(node.tag),
	]),
);

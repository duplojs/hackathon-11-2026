import * as DPrinter from "@duplojs/lang/printer";
import { type ImportDeclaration } from "../../AST/declaration";
import { createNodePrinter, escapeQuotedValue } from "..";

export const printImportDeclaration = createNodePrinter<ImportDeclaration>(
	(node, context) => {
		const alias = node.alias === "." ? "." : node.alias && context.renderNode(node.alias);
		return DPrinter.renderLine(["import", alias, escapeQuotedValue(node.path)]);
	},
);

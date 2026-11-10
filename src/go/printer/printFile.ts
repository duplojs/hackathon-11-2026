import * as DArray from "@duplojs/lang/array";
import * as DPrinter from "@duplojs/lang/printer";
import { type GoFile } from "../AST/file";
import { blockStatement } from "../AST/statement/block";
import { createNodePrinter } from "./createNodePrinter";
import { renderNodeList } from "./renderNodeList";
import { renderNodeLines } from "./renderNodeLines";

export const printFile = createNodePrinter<GoFile>(
	(node, context) => {
		const sections = [
			`package ${context.renderNode(node.packageName)}`,
			node.imports.length > 0 && renderNodeLines(node.imports, context),
			node.declarations.length > 0 && renderNodeList(node.declarations, context, "\n\n"),
			DArray.length(node.init) > 0 && `func init() ${context.renderNode(blockStatement({ statements: node.init }))}`,
		];
		return `${DPrinter.renderLine(sections, { joinCharacter: "\n\n" })}\n`;
	},
);

import * as DPrinter from "@duplojs/lang/printer";
import { type GoFile } from "../AST/common";
import { createNodePrinter } from "./createNodePrinter";
import { renderNodeList } from "./renderNodeList";
import { renderNodeLines } from "./renderNodeLines";

export const printFile = createNodePrinter<GoFile>(
	(node, context) => {
		const sections = [
			`package ${context.renderNode(node.packageName)}`,
			node.imports.length > 0 && renderNodeLines(node.imports, context),
			node.topLevelDeclarations.length > 0 && renderNodeList(node.topLevelDeclarations, context, "\n\n"),
		];
		return `${DPrinter.renderLine(sections, { joinCharacter: "\n\n" })}\n`;
	},
);

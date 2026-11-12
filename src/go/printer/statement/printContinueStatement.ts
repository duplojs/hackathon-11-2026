import * as DPrinter from "@duplojs/lang/printer";
import { type ContinueStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printContinueStatement = createNodePrinter<ContinueStatement>(
	(node, context) => DPrinter.renderLine(["continue", node.label && context.renderNode(node.label)]),
);

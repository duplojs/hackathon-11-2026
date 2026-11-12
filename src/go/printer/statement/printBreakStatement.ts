import * as DPrinter from "@duplojs/lang/printer";
import { type BreakStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printBreakStatement = createNodePrinter<BreakStatement>(
	(node, context) => DPrinter.renderLine(["break", node.label && context.renderNode(node.label)]),
);

import * as DPrinter from "@duplojs/lang/printer";
import { type BreakStatement } from "../../AST/statement/jump";
import { createNodePrinter } from "../createNodePrinter";

export const printBreakStatement = createNodePrinter<BreakStatement>(
	(node, context) => DPrinter.renderLine(["break", node.label && context.renderNode(node.label)]),
);

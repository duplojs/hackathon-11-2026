import * as DPrinter from "@duplojs/lang/printer";
import { type ContinueStatement } from "../../AST/statement/jump";
import { createNodePrinter } from "../createNodePrinter";

export const printContinueStatement = createNodePrinter<ContinueStatement>(
	(node, context) => DPrinter.renderLine(["continue", node.label && context.renderNode(node.label)]),
);

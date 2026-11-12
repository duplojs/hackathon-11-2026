import * as DPrinter from "@duplojs/lang/printer";
import { type ReturnStatement } from "../../AST/statement";
import { createNodePrinter, renderNodeList } from "..";

export const printReturnStatement = createNodePrinter<ReturnStatement>(
	(node, context) => DPrinter.renderLine(["return", node.values.length > 0 && renderNodeList(node.values, context)]),
);

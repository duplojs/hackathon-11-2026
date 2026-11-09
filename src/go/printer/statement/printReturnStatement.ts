import * as DPrinter from "@duplojs/lang/printer";
import { type ReturnStatement } from "../../AST/statement/jump";
import { createNodePrinter } from "../createNodePrinter";
import { renderNodeList } from "../renderNodeList";

export const printReturnStatement = createNodePrinter<ReturnStatement>(
	(node, context) => DPrinter.renderLine(["return", node.values.length > 0 && renderNodeList(node.values, context)]),
);

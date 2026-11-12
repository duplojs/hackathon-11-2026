import { type SendStatement } from "../../AST/statement";
import { createNodePrinter } from "..";
import { renderOperand } from "../expression";

export const printSendStatement = createNodePrinter<SendStatement>(
	(node, context) => `${renderOperand(node.channel, context, 7)} <- ${context.renderNode(node.value)}`,
);

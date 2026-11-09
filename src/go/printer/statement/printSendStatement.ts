import { type SendStatement } from "../../AST/statement/channel";
import { createNodePrinter } from "../createNodePrinter";
import { renderOperand } from "../expression/renderOperand";

export const printSendStatement = createNodePrinter<SendStatement>(
	(node, context) => `${renderOperand(node.channel, context, 7)} <- ${context.renderNode(node.value)}`,
);

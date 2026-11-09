import { type LabeledStatement } from "../../AST/statement/jump";
import { createNodePrinter } from "../createNodePrinter";

export const printLabeledStatement = createNodePrinter<LabeledStatement>(
	(node, context) => `${context.renderNode(node.label)}: ${context.renderNode(node.statement)}`,
);

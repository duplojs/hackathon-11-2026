import { type LabeledStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printLabeledStatement = createNodePrinter<LabeledStatement>(
	(node, context) => `${context.renderNode(node.label)}: ${context.renderNode(node.statement)}`,
);

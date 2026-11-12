import { type CompoundAssignmentStatement } from "../../AST/statement";
import { createNodePrinter } from "..";

export const printCompoundAssignmentStatement = createNodePrinter<CompoundAssignmentStatement>(
	(node, context) => `${context.renderNode(node.target)} ${node.operator} ${context.renderNode(node.value)}`,
);

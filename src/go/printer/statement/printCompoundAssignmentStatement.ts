import { type CompoundAssignmentStatement } from "../../AST/statement/assignment";
import { createNodePrinter } from "../createNodePrinter";

export const printCompoundAssignmentStatement = createNodePrinter<CompoundAssignmentStatement>(
	(node, context) => `${context.renderNode(node.target)} ${node.operator} ${context.renderNode(node.value)}`,
);

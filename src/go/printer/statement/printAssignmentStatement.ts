import { type AssignmentStatement } from "../../AST/statement";
import { createNodePrinter, renderNodeList } from "..";

export const printAssignmentStatement = createNodePrinter<AssignmentStatement>(
	(node, context) => `${renderNodeList(node.targets, context)} = ${renderNodeList(node.values, context)}`,
);

import { type AssignmentStatement } from "../../AST/statement/assignment";
import { createNodePrinter } from "../createNodePrinter";
import { renderNodeList } from "../renderNodeList";

export const printAssignmentStatement = createNodePrinter<AssignmentStatement>(
	(node, context) => `${renderNodeList(node.targets, context)} = ${renderNodeList(node.values, context)}`,
);

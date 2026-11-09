import { type SelectCase } from "../../AST/statement/select";
import { createNodePrinter } from "../createNodePrinter";
import { renderCaseBody } from "./renderCaseBody";

export const printSelectCase = createNodePrinter<SelectCase>(
	(node, context) => renderCaseBody(`case ${context.renderNode(node.communication)}`, node.statements, context),
);

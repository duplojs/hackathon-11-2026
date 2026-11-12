import { type TypeSwitchCase } from "../../AST/statement";
import { createNodePrinter, renderNodeList } from "..";
import { renderCaseBody } from "./renderCaseBody";

export const printTypeSwitchCase = createNodePrinter<TypeSwitchCase>(
	(node, context) => renderCaseBody(`case ${renderNodeList(node.types, context)}`, node.statements, context),
);

import { type TypeSwitchCase } from "../../AST/statement/switch";
import { createNodePrinter } from "../createNodePrinter";
import { renderNodeList } from "../renderNodeList";
import { renderCaseBody } from "./renderCaseBody";

export const printTypeSwitchCase = createNodePrinter<TypeSwitchCase>(
	(node, context) => renderCaseBody(`case ${renderNodeList(node.types, context)}`, node.statements, context),
);

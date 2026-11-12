import { type TypeSwitchStatementWithDefault } from "../../AST/statement";
import { createNodePrinter, renderBracedNodes } from "..";
import { renderTypeSwitchHeader } from "./renderTypeSwitchHeader";

export const printTypeSwitchStatementWithDefault = createNodePrinter<TypeSwitchStatementWithDefault>(
	(node, context) => `${renderTypeSwitchHeader(node.initializer, node.identifier, node.expression, context)} ${renderBracedNodes([...node.casesBeforeDefault, node.defaultCase, ...node.casesAfterDefault], context)}`,
);

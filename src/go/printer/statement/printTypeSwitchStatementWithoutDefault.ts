import { type TypeSwitchStatementWithoutDefault } from "../../AST/statement/switch";
import { createNodePrinter } from "../createNodePrinter";
import { renderBracedNodes } from "../renderBracedNodes";
import { renderTypeSwitchHeader } from "./renderTypeSwitchHeader";

export const printTypeSwitchStatementWithoutDefault = createNodePrinter<TypeSwitchStatementWithoutDefault>(
	(node, context) => `${renderTypeSwitchHeader(node.initializer, node.identifier, node.expression, context)} ${renderBracedNodes(node.cases, context)}`,
);

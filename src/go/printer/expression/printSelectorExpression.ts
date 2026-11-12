import { type SelectorExpression } from "../../AST/expression";
import { createNodePrinter } from "..";
import { renderSelectorTarget } from "./renderSelectorTarget";

export const printSelectorExpression = createNodePrinter<SelectorExpression>(
	(node, context) => `${renderSelectorTarget(node.target, context)}.${context.renderNode(node.identifier)}`,
);

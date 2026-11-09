import { type SelectorExpression } from "../../AST/expression/access";
import { createNodePrinter } from "../createNodePrinter";
import { renderSelectorTarget } from "./renderSelectorTarget";

export const printSelectorExpression = createNodePrinter<SelectorExpression>(
	(node, context) => `${renderSelectorTarget(node.target, context)}.${context.renderNode(node.identifier)}`,
);

import { type InstantiationExpression } from "../../AST/expression";
import { createNodePrinter, renderNodeList } from "..";

export const printInstantiationExpression = createNodePrinter<InstantiationExpression>(
	(node, context) => `${context.renderNode(node.target)}[${renderNodeList(node.typeArguments, context)}]`,
);

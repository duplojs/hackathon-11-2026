import { type InstantiationExpression } from "../../AST/expression/instantiation";
import { createNodePrinter } from "../createNodePrinter";
import { renderNodeList } from "../renderNodeList";

export const printInstantiationExpression = createNodePrinter<InstantiationExpression>(
	(node, context) => `${context.renderNode(node.target)}[${renderNodeList(node.typeArguments, context)}]`,
);

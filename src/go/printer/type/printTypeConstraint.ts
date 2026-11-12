import { type TypeConstraint } from "../../AST/common";
import { createNodePrinter } from "..";

export const printTypeConstraint = createNodePrinter<TypeConstraint>(
	(node, context) => `~${context.renderNode(node.typeReference)}`,
);

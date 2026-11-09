import { type TypeConstraint } from "../../AST/type/constraint";
import { createNodePrinter } from "../createNodePrinter";

export const printTypeConstraint = createNodePrinter<TypeConstraint>(
	(node, context) => `~${context.renderNode(node.typeReference)}`,
);

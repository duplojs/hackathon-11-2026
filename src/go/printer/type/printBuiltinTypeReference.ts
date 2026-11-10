import { type BuiltinTypeReference } from "../../AST/type/builtin";
import { createNodePrinter } from "../createNodePrinter";

export const printBuiltinTypeReference = createNodePrinter<BuiltinTypeReference>(
	(node) => node.value,
);

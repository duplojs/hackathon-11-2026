import { type ImaginaryLiteral } from "../../AST/expression/literal";
import { createNodePrinter } from "../createNodePrinter";

export const printImaginaryLiteral = createNodePrinter<ImaginaryLiteral>(
	(node) => `${node.value}i`,
);

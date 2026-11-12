import { type ImaginaryLiteral } from "../../AST/expression";
import { createNodePrinter } from "..";

export const printImaginaryLiteral = createNodePrinter<ImaginaryLiteral>(
	(node) => `${node.value}i`,
);

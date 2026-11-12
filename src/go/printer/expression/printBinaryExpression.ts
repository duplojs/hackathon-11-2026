import { type BinaryExpression } from "../../AST/expression";
import { createNodePrinter } from "..";
import { getBinaryPrecedence } from "./getBinaryPrecedence";
import { renderOperand } from "./renderOperand";

export const printBinaryExpression = createNodePrinter<BinaryExpression>(
	(node, context) => {
		const precedence = getBinaryPrecedence(node.operator);
		return `${renderOperand(node.left, context, precedence)} ${node.operator} ${renderOperand(node.right, context, precedence + 1)}`;
	},
);

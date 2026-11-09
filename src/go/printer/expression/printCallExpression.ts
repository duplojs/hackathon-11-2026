import * as DArray from "@duplojs/lang/array";
import * as DPrinter from "@duplojs/lang/printer";
import { type CallExpression } from "../../AST/expression/call";
import { createNodePrinter } from "../createNodePrinter";
import { renderOperand } from "./renderOperand";

export const printCallExpression = createNodePrinter<CallExpression>(
	(node, context) => {
		const argumentsText = DPrinter.renderLine([
			node.typeArgument && context.renderNode(node.typeArgument),
			DArray.map(node.arguments, (argument) => context.renderNode(argument)),
			node.variadicArgument && `${context.renderNode(node.variadicArgument)}...`,
		], { joinCharacter: ", " });
		return `${renderOperand(node.callee, context, 7)}(${argumentsText})`;
	},
);

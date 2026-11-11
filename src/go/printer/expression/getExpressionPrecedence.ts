import * as DModeling from "@duplojs/lang/modeling";
import * as DString from "@duplojs/lang/string";
import { type Expression } from "../../AST/expression/base";
import { getBinaryPrecedence } from "./getBinaryPrecedence";

export function getExpressionPrecedence(node: Expression, text: string) {
	if (DModeling.hasTagValue(node, "[node][expression]:binary")) {
		return getBinaryPrecedence(node.operator);
	}
	if (
		DModeling.hasTagValue(node, [
			"[node][expression]:unary",
			"[node][expression]:address",
			"[node][expression]:dereference",
			"[node][expression]:receive",
		])
		|| DString.startsWith(text, "-")
		|| DString.startsWith(text, "+")
	) {
		return 6;
	}
	return 7;
}

import * as TS from "typescript/ast";
import type { BuildContext } from "../../context/build";
import { expressionTransformers } from "../expression";

export async function transformExpression(
	node: TS.Expression,
	context: BuildContext,
) {
	if (TS.isIdentifier(node)) {
		return context.success({ result: context.createSourceIdentifier(node.text) });
	}

	return context.transform(node, expressionTransformers.value);
}

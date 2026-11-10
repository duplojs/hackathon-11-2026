import * as TS from "typescript/ast";
import type { TransformerContext } from "../../context";
import type { LocalTransformerContext } from "../../localContext";
import { expressionTransformers } from "../expression";

export async function transformExpression(
	node: TS.Expression,
	context: TransformerContext,
	localContext: LocalTransformerContext,
) {
	if (TS.isIdentifier(node)) {
		return context.success({ result: context.createSourceIdentifier(node.text) });
	}

	return context.transform(node, expressionTransformers.value, localContext);
}

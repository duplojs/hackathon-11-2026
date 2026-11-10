import * as GO from "@go";
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
		return context.success({ result: GO.AST.createIdentifier(node.text) });
	}

	return context.transform(node, expressionTransformers.value, localContext);
}

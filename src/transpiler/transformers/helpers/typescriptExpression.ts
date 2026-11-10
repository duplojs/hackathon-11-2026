import * as DEither from "@duplojs/lang/either";
import * as TS from "typescript/ast";
import type { BuildContext } from "../../context/build";
import { expressionTransformers } from "../expression";

export async function transformExpression(
	node: TS.Expression,
	context: BuildContext,
) {
	if (TS.isIdentifier(node)) {
		const dependency = await context.registerDependency(node);
		if (DEither.isLeft(dependency)) {
			return dependency;
		}

		return context.success({ result: context.createSourceIdentifier(node.text) });
	}

	return context.transform(node, expressionTransformers.value);
}

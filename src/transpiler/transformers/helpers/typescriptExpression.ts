import * as DEither from "@duplojs/lang/either";
import * as GO from "@go";
import * as TS from "typescript/ast";
import type { BuildContext } from "../../context/build";
import { expressionTransformers } from "../expression";

export async function transformExpression(
	node: TS.Expression,
	context: BuildContext,
) {
	if (TS.isIdentifier(node)) {
		const dependency = await context.registerDependency(node);
		const identifier = context.createSourceIdentifier(node.text);

		if (DEither.isLeft(dependency)) {
			return context.success({ result: identifier });
		}

		return context.success({
			result: GO.AST.selectorExpression({
				target: DEither.unwrapRight(dependency),
				identifier,
			}),
		});
	}

	return context.transform(node, expressionTransformers.value);
}

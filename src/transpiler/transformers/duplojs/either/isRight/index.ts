import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { isRightMethodIdentifier } from "../sharedDependency";

/**
 * `DEither.isRight(value)` → `value.IsRight()`.
 * Chaque variante Go implémente `IsRight()` : l'appel de méthode suffit,
 * sans assertion de type ni helper.
 */
export async function isRightExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	const argumentNode = TsAST.isCallExpression(node)
		? DArray.first(node.arguments)
		: undefined;

	// Forme non prise en charge : `isRight` passé comme valeur (ex. à un filter).
	if (!argumentNode) {
		return context.error(node, "is-right-must-be-called-with-value");
	}

	const argument = await DCommon.asyncPipe(
		context.transform(argumentNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	return context.success({
		before: argument.before,
		result: GoAST.createCallExpression({
			callee: GoAST.createSelectorExpression({
				target: argument.result,
				identifier: isRightMethodIdentifier,
			}),
			arguments: [],
		}),
	});
}

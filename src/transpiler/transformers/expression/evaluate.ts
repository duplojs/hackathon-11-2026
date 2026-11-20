import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import type { TsAST } from "@typescript";
import type { BuildContext } from "../../context/build";
import { expressionTransformers } from ".";
import { getReadableName } from "../shared/readableName";

export interface EvaluatedExpression {
	readonly before: readonly GoAST.Statement[];
	readonly identifier: GoAST.Identifier;
}

export interface EvaluatedExpressions {
	readonly before: readonly GoAST.Statement[];
	readonly identifiers: readonly GoAST.Identifier[];
}

// Évalue une expression dans une variable temporaire : sa valeur est calculée une seule fois,
// à cet endroit, même si elle est utilisée ensuite dans plusieurs branches.
export async function evaluateToVariable(
	node: TsAST.Expression,
	context: BuildContext,
) {
	const expression = await DCommon.asyncPipe(
		context.transform(node, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(expression)) {
		return expression;
	}

	const variable = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(getReadableName(node, "value")),
		initializer: expression.result,
	});

	return DEither.success<EvaluatedExpression>({
		before: DArray.push(expression.before, variable),
		identifier: variable.identifier,
	});
}

// Évalue des arguments dans leur ordre d'apparition, comme JavaScript avant un appel.
export async function evaluateAllToVariables(
	nodes: readonly TsAST.Expression[],
	context: BuildContext,
) {
	const evaluated = await DCommon.asyncPipe(
		nodes,
		DArray.map((node) => evaluateToVariable(node, context)),
		DCommon.promiseAll,
		DArray.reduce(
			DArray.reduceFrom<EvaluatedExpressions>({
				before: [],
				identifiers: [],
			}),
			({ element, lastValue, next, exit }) => {
				if (DEither.isLeft(element)) {
					return exit(element);
				}

				const variable = DEither.unwrapRight(element);

				return next({
					before: DArray.concat(lastValue.before, variable.before),
					identifiers: DArray.push(lastValue.identifiers, variable.identifier),
				});
			},
		),
	);

	if (DEither.isLeft(evaluated)) {
		return evaluated;
	}

	return DEither.success(evaluated);
}

// Une variable dont l'usage a été éliminé à la compilation est consommée explicitement :
// Go refuse les variables locales inutilisées.
export function consumeVariable(identifier: GoAST.Identifier) {
	return GoAST.createAssignmentStatement({
		targets: DCommon.cast([GoAST.createIdentifier("_")]),
		values: DCommon.cast([identifier]),
	});
}

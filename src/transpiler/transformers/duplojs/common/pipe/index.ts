import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";

// DCommon.pipe(x, s1, …, sn) : inliné en appels séquentiels (ADR-3,
// PLAN_HACKATHON.md §0.5) : `t0 := x; t1 := s1(t0); …`. Chaque étape est
// transformée comme une expression ordinaire (identifiant, func literal
// curryfié produit par DEither.whenIsRight(f)…) puis appelée immédiatement :
// cette fonction ne connaît rien de la forme concrète d'une étape, elle se
// contente de l'appeler, ce que Go inline normalement pour un func literal
// non échappé (à vérifier avec -gcflags=-m, voir l'ADR-3). Zéro étape
// renvoie x inchangé.
export async function pipeExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.notSupport();
	}

	const valueNode = DArray.first(node.arguments);

	if (!valueNode) {
		return context.error(node, "missing-pipe-value");
	}

	const valueResult = await DCommon.asyncPipe(
		context.transform(valueNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(valueResult)) {
		return valueResult;
	}

	const stepNodes = DArray.shift(node.arguments);

	if (DArray.lengthEqual(stepNodes, 0)) {
		return context.success(valueResult);
	}

	const valueBinding = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: valueResult.result,
	});

	const stepsResult = await DCommon.asyncPipe(
		stepNodes,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<{
				before: readonly GoAST.Statement[];
				previous: GoAST.Identifier;
			}>({
				before: [...valueResult.before, valueBinding],
				previous: valueBinding.identifier,
			}),
			async({ item, lastValue, next, exit }) => {
				const step = await DCommon.asyncPipe(
					context.transform(item, expressionTransformers.value),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(step)) {
					return exit(step);
				}

				const stepBinding = GoAST.createShortVariableDeclarationStatement({
					identifier: context.generateIdentifier(),
					initializer: GoAST.createCallExpression({
						callee: step.result,
						arguments: [lastValue.previous],
					}),
				});

				return next({
					before: DArray.concat(lastValue.before, step.before, [stepBinding]),
					previous: stepBinding.identifier,
				});
			},
		),
	);

	if (DEither.isLeft(stepsResult)) {
		return stepsResult;
	}

	return context.success({
		before: stepsResult.before,
		result: stepsResult.previous,
	});
}

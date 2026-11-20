import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from ".";
import { transformCheckerType } from "../type/fromChecker";

/**
 * `condition ? whenTrue : whenFalse` → Go n'a pas d'opérateur ternaire :
 * ```go
 * var result T
 * if condition {
 *     result = whenTrue
 * } else {
 *     result = whenFalse
 * }
 * ```
 * Seule la branche choisie est évaluée : les `before` de chaque branche restent
 * dans son bloc. `T` est le type de l'expression entière, donné par le checker.
 */
export const conditionalExpressionTransformer: Transformer<GoAST.Identifier> = createTransformer(
	async(node, context) => {
		if (!TsAST.isConditionalExpression(node)) {
			return context.notSupport();
		}

		const condition = await DCommon.asyncPipe(
			context.transform(node.condition, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(condition)) {
			return condition;
		}

		const whenTrue = await DCommon.asyncPipe(
			context.transform(node.whenTrue, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(whenTrue)) {
			return whenTrue;
		}

		const whenFalse = await DCommon.asyncPipe(
			context.transform(node.whenFalse, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(whenFalse)) {
			return whenFalse;
		}

		const resultType = await DCommon.asyncPipe(
			transformCheckerType(
				await context.transpilation.typeChecker.getTypeAtLocation(node),
				node,
				context,
			),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(resultType)) {
			return resultType;
		}

		const result = context.generateIdentifier();

		const assignBranch = (branch: typeof whenTrue) => GoAST.createBlockStatement({
			statements: DArray.concat(
				branch.before,
				[
					GoAST.createAssignmentStatement({
						targets: DCommon.cast([result]),
						values: DCommon.cast([branch.result]),
					}),
				],
			),
		});

		return context.success({
			before: DArray.concat(
				condition.before,
				resultType.before,
				[
					GoAST.createVariableDeclarationZeroValue({
						identifier: result,
						typeReference: resultType.result,
					}),
					GoAST.createIfStatement({
						condition: condition.result,
						body: assignBranch(whenTrue),
						elseBranch: assignBranch(whenFalse),
					}),
				],
			),
			result,
		});
	},
);

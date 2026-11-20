import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../context/build";
import { goTypeOf, type GoType } from "../type/goTypeOf";
import { coerceExpression } from "../duplojs/either/coerce";
import { expressionTransformers } from ".";

// Une branche du ternaire : ses préparations RESTENT dans sa branche (ADR-8), puis
// sa valeur est convertie vers le type du ternaire et affectée au résultat.
async function transformBranch(params: {
	node: TsAST.Expression;
	conditional: TsAST.ConditionalExpression;
	result: GoAST.Identifier;
	context: BuildContext;
}) {
	const { node, conditional, result, context } = params;
	const { typeChecker } = context.transpilation;

	const branch = DEither.unwrapRight(await context.transform(node, expressionTransformers.value));

	if (DEither.isLeft(branch)) {
		return branch;
	}

	const coerced = DEither.unwrapRight(
		await coerceExpression(
			{
				expression: branch.result,
				from: await typeChecker.getTypeAtLocation(node),
				to: await typeChecker.getTypeAtLocation(conditional),
				site: node,
			},
			context,
		),
	);

	if (DEither.isLeft(coerced)) {
		return DEither.hasInformation(coerced, "transformation-not-supported")
			? context.error(node, "conditional-branch-unsupported-coercion")
			: coerced;
	}

	return context.success({
		result: GoAST.createBlockStatement({
			statements: [
				...branch.before,
				GoAST.createAssignmentStatement({
					targets: DCommon.cast([result]),
					values: DCommon.cast([coerced.result]),
				}),
			],
		}),
	});
}

/**
 * `c ? a : b` (ADR-8) : Go n'a pas d'opérateur ternaire.
 *   before(c) ; var t T ; if c { before(a) ; t = a } else { before(b) ; t = b }
 * `a` et `b` ne sont jamais évalués tous les deux. T = type Go du ternaire.
 */
export const conditionalExpressionTransformer: Transformer<GoAST.Identifier> = createTransformer(
	async(node, context) => {
		if (!TsAST.isConditionalExpression(node)) {
			return context.notSupport();
		}

		const condition = DEither.unwrapRight(await context.transform(node.condition, expressionTransformers.value));

		if (DEither.isLeft(condition)) {
			return condition;
		}

		const { typeChecker } = context.transpilation;
		const resultType = DEither.unwrapRight(
			await goTypeOf(
				await typeChecker.getBaseTypeOfLiteralType(await typeChecker.getTypeAtLocation(node)),
				node,
				context,
			),
		);

		if (DEither.isLeft(resultType)) {
			return resultType;
		}

		const result = context.generateIdentifier();

		const whenTrue = DEither.unwrapRight(
			await transformBranch({
				node: node.whenTrue,
				conditional: node,
				result,
				context,
			}),
		);

		if (DEither.isLeft(whenTrue)) {
			return whenTrue;
		}

		const whenFalse = DEither.unwrapRight(
			await transformBranch({
				node: node.whenFalse,
				conditional: node,
				result,
				context,
			}),
		);

		if (DEither.isLeft(whenFalse)) {
			return whenFalse;
		}

		return context.success({
			before: [
				...condition.before,
				GoAST.createVariableDeclarationZeroValue({
					identifier: result,
					typeReference: resultType.result satisfies GoType,
				}),
				GoAST.createIfStatement({
					condition: condition.result,
					body: whenTrue.result,
					elseBranch: whenFalse.result,
				}),
			],
			result,
		});
	},
);

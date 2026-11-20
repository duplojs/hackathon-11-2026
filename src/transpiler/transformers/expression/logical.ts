import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from ".";

/**
 * `left && right` / `left || right` sur des booléens, avec court-circuit :
 * ```go
 * result := left
 * if result {          // `||` : if !result
 *     <before de right>
 *     result = right
 * }
 * ```
 * Le transformer binaire générique évalue les deux opérandes avant l'opérateur :
 * pour `&&`/`||`, les préparations de `right` (appels, ternaires…) seraient alors
 * exécutées même quand `left` suffit. Ici, `right` n'est évalué que si nécessaire,
 * comme en JS.
 * Limite : `a || b` sur des valeurs non booléennes (valeur par défaut en JS) n'est pas traduit.
 */
export const logicalExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (
			!TsAST.isBinaryExpression(node)
			|| (
				node.operatorToken.kind !== TsAST.SyntaxKind.AmpersandAmpersandToken
				&& node.operatorToken.kind !== TsAST.SyntaxKind.BarBarToken
			)
		) {
			return context.notSupport();
		}

		const left = await DCommon.asyncPipe(
			context.transform(node.left, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(left)) {
			return left;
		}

		const right = await DCommon.asyncPipe(
			context.transform(node.right, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(right)) {
			return right;
		}

		const isAnd = node.operatorToken.kind === TsAST.SyntaxKind.AmpersandAmpersandToken;

		// Si le membre droit n'a aucune instruction préalable (pas d'effet de bord à préparer),
		// émettre directement l'expression binaire Go sans variable temporaire ni if.
		if (right.before.length === 0) {
			return context.success({
				before: left.before,
				result: GoAST.createBinaryExpression({
					operator: isAnd ? "&&" : "||",
					left: left.result,
					right: right.result,
				}),
			});
		}

		const result = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: left.result,
		});

		return context.success({
			before: DArray.concat(
				left.before,
				[
					result,
					GoAST.createIfStatement({
						condition: isAnd
							? result.identifier
							: GoAST.createUnaryExpression({
								operator: "!",
								operand: result.identifier,
							}),
						body: GoAST.createBlockStatement({
							statements: DArray.concat(
								right.before,
								[
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([result.identifier]),
										values: DCommon.cast([right.result]),
									}),
								],
							),
						}),
					}),
				],
			),
			result: result.identifier,
		});
	},
);

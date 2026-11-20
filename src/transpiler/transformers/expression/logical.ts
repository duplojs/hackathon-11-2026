import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { TypeFlags } from "typescript/async";
import { expressionTransformers } from ".";
import { createSimpleAssignment } from "../common";

/**
 * `a || b` et `a && b`, avec court-circuit : b n'est calculé que si besoin.
 * Les deux côtés doivent être des booléens.
 */
export const logicalExpressionTransformer: Transformer<GoAST.Identifier> = createTransformer(
	async(node, context) => {
		if (
			!TsAST.isBinaryExpression(node)
			|| (
				node.operatorToken.kind !== TsAST.SyntaxKind.BarBarToken
				&& node.operatorToken.kind !== TsAST.SyntaxKind.AmpersandAmpersandToken
			)
		) {
			return context.notSupport();
		}

		const { typeChecker } = context.transpilation;
		const leftType = await typeChecker.getTypeAtLocation(node.left);
		const rightType = await typeChecker.getTypeAtLocation(node.right);

		if (
			!(leftType.flags & TypeFlags.BooleanLike)
			|| !(rightType.flags & TypeFlags.BooleanLike)
		) {
			return context.error(node, "logical-operand-is-not-boolean");
		}

		const left = await DCommon.asyncPipe(
			context.transform(node.left, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(left)) {
			return left;
		}

		const resultAssignment = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: left.result,
		});

		const right = await DCommon.asyncPipe(
			context.transform(node.right, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(right)) {
			return right;
		}

		// || : on calcule la droite si la gauche est fausse ; && : si elle est vraie.
		const computeRightWhen = node.operatorToken.kind === TsAST.SyntaxKind.BarBarToken
			? GoAST.createUnaryExpression({
				operator: "!",
				operand: resultAssignment.identifier,
			})
			: resultAssignment.identifier;

		return context.success({
			before: DArray.concat(
				left.before,
				[
					resultAssignment,
					GoAST.createIfStatement({
						condition: computeRightWhen,
						body: GoAST.createBlockStatement({
							statements: DArray.push(
								right.before,
								createSimpleAssignment(resultAssignment.identifier, right.result),
							),
						}),
					}),
				],
			),
			result: resultAssignment.identifier,
		});
	},
);

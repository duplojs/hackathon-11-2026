import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from ".";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";

/**
 * `-x` seulement. Toujours appliqué à une variable : une constante Go n'a pas
 * de zéro négatif (`-0` deviendrait `0`).
 */
export const prefixUnaryExpressionTransformer: Transformer<GoAST.UnaryExpression> = createTransformer(
	async(node, context) => {
		if (
			!TsAST.isPrefixUnaryExpression(node)
			|| node.operator !== TsAST.SyntaxKind.MinusToken
		) {
			return context.notSupport();
		}

		const operand = await DCommon.asyncPipe(
			context.transform(node.operand, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(operand)) {
			return operand;
		}

		const operandAssignment = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: operand.result,
		});

		return context.success({
			before: DArray.concat(
				operand.before,
				[operandAssignment],
			),
			result: GoAST.createUnaryExpression({
				operator: "-",
				operand: operandAssignment.identifier,
			}),
		});
	},
);

import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from ".";

/**
 * Opérateurs préfixes dont le sens est identique en Go sur nos représentations :
 * `-x` et `+x` sur un `float64`, `!x` sur un `bool`.
 * `~x` (entier 32 bits en JS) et `++x`/`--x` (affectation) ne sont pas pris en charge.
 */
const prefixOperators: Partial<Record<TsAST.SyntaxKind, GoAST.UnaryOperator>> = {
	[TsAST.SyntaxKind.MinusToken]: "-",
	[TsAST.SyntaxKind.PlusToken]: "+",
	[TsAST.SyntaxKind.ExclamationToken]: "!",
};

/**
 * `-1` → `-(float64)(1)` : en TypeScript, `-1` est l'opérateur `-` appliqué au littéral `1`.
 */
export const prefixUnaryExpressionTransformer: Transformer<GoAST.UnaryExpression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isPrefixUnaryExpression(node)) {
			return context.notSupport();
		}

		const operator = prefixOperators[node.operator];

		if (!operator) {
			return context.notSupport();
		}

		const operand = await DCommon.asyncPipe(
			context.transform(node.operand, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(operand)) {
			return operand;
		}

		return context.success({
			before: operand.before,
			result: GoAST.createUnaryExpression({
				operator,
				operand: operand.result,
			}),
		});
	},
);

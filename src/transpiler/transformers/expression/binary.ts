import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from ".";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";

const binaryOperators: Partial<
	Record<TsAST.SyntaxKind, GoAST.BinaryOperator>
> = {
	[TsAST.SyntaxKind.PlusToken]: "+",
	[TsAST.SyntaxKind.MinusToken]: "-",
	[TsAST.SyntaxKind.AsteriskToken]: "*",
	[TsAST.SyntaxKind.SlashToken]: "/",
	[TsAST.SyntaxKind.PercentToken]: "%",

	[TsAST.SyntaxKind.AmpersandToken]: "&",
	[TsAST.SyntaxKind.BarToken]: "|",
	[TsAST.SyntaxKind.CaretToken]: "^",
	[TsAST.SyntaxKind.LessThanLessThanToken]: "<<",
	[TsAST.SyntaxKind.GreaterThanGreaterThanToken]: ">>",

	[TsAST.SyntaxKind.AmpersandAmpersandToken]: "&&",
	[TsAST.SyntaxKind.BarBarToken]: "||",

	[TsAST.SyntaxKind.EqualsEqualsEqualsToken]: "==",
	[TsAST.SyntaxKind.ExclamationEqualsEqualsToken]: "!=",
	[TsAST.SyntaxKind.LessThanToken]: "<",
	[TsAST.SyntaxKind.LessThanEqualsToken]: "<=",
	[TsAST.SyntaxKind.GreaterThanToken]: ">",
	[TsAST.SyntaxKind.GreaterThanEqualsToken]: ">=",
};

export const binaryExpressionTransformer: Transformer<GoAST.BinaryExpression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isBinaryExpression(node)) {
			return context.notSupport();
		}

		const operator = binaryOperators[node.operatorToken.kind];

		if (!operator) {
			return context.notSupport();
		}

		const left = await DCommon.asyncPipe(
			context.transform(node.left, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(left)) {
			return left;
		}

		const leftAssignment = GoAST.createShortVariableDeclarationStatement({
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

		const rightAssignment = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: right.result,
		});

		return context.success({
			before: DArray.concat(
				left.before,
				[leftAssignment],
				right.before,
				[rightAssignment],
			),
			result: GoAST.createBinaryExpression({
				operator,
				right: rightAssignment.identifier,
				left: leftAssignment.identifier,
			}),
		});
	},
);

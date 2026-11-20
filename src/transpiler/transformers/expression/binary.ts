import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from ".";
import { getReadableName } from "../shared/readableName";
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

export const binaryExpressionTransformer: Transformer<GoAST.BinaryExpression | GoAST.Identifier> = createTransformer(
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
			identifier: context.generateIdentifier(getReadableName(node.left, "left")),
			initializer: left.result,
		});

		const right = await DCommon.asyncPipe(
			context.transform(node.right, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(right)) {
			return right;
		}

		// `&&` et `||` n'évaluent leur opérande droit que si le gauche ne suffit pas. Sans
		// préparation, l'opérateur Go a le même court-circuit. Sinon, les préparations du côté
		// droit sont placées dans un `if` qui n'est exécuté que lorsque ce côté est nécessaire.
		if (operator === "&&" || operator === "||") {
			if (DArray.lengthEqual(right.before, 0)) {
				return context.success({
					before: DArray.push(left.before, leftAssignment),
					result: GoAST.createBinaryExpression({
						operator,
						left: leftAssignment.identifier,
						right: right.result,
					}),
				});
			}

			const result = GoAST.createShortVariableDeclarationStatement({
				identifier: context.generateIdentifier("logicalResult"),
				initializer: leftAssignment.identifier,
			});

			return context.success({
				before: DArray.concat(
					left.before,
					[
						leftAssignment,
						result,
						GoAST.createIfStatement({
							condition: operator === "&&"
								? result.identifier
								: GoAST.createUnaryExpression({
									operator: "!",
									operand: result.identifier,
								}),
							body: GoAST.createBlockStatement({
								statements: DArray.push(
									right.before,
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([result.identifier]),
										values: DCommon.cast([right.result]),
									}),
								),
							}),
						}),
					],
				),
				result: result.identifier,
			});
		}

		const rightAssignment = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(getReadableName(node.right, "right")),
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

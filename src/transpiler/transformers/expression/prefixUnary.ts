import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { TypeFlags } from "typescript/async";
import { expressionTransformers } from ".";
import { getReadableName } from "../shared/readableName";

// `-` sur un nombre suit IEEE 754 dans les deux langages (`-0` est conservé).
// `!` n'est traduit que sur un booléen : sur une autre valeur il dépend de la vérité JavaScript.
export const prefixUnaryExpressionTransformer: Transformer<GoAST.UnaryExpression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isPrefixUnaryExpression(node)) {
			return context.notSupport();
		}

		const operandType = await context.transpilation.typeChecker.getTypeAtLocation(node.operand);

		const isNegation = node.operator === TsAST.SyntaxKind.MinusToken
			&& Boolean(operandType.flags & TypeFlags.NumberLike);
		const isNot = node.operator === TsAST.SyntaxKind.ExclamationToken
			&& Boolean(operandType.flags & TypeFlags.BooleanLike);

		if (!isNegation && !isNot) {
			return context.notSupport();
		}

		const operand = await DCommon.asyncPipe(
			context.transform(node.operand, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(operand)) {
			return operand;
		}

		// L'opérande passe par une variable : appliqué à une constante, l'opérateur serait évalué
		// par l'arithmétique constante exacte de Go, qui ne connaît pas `-0` (de même que
		// `0.1 + 0.2` y vaut exactement `0.3`).
		const operandAssignment = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(getReadableName(node.operand, "operand")),
			initializer: operand.result,
		});

		return context.success({
			before: DArray.push(operand.before, operandAssignment),
			result: GoAST.createUnaryExpression({
				operator: isNegation ? "-" : "!",
				operand: operandAssignment.identifier,
			}),
		});
	},
);

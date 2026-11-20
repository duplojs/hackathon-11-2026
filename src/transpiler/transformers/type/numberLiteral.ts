import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";

/** Type littéral nombre (`0`, `-1`) -> `float64` : Go n'a pas de types littéraux. */
export const numberLiteralTypeTransformer: Transformer<GoAST.BuiltinTypeReference<"float64">> = createTransformer(
	(node, context) => {
		if (!TsAST.isLiteralTypeNode(node)) {
			return context.notSupport();
		}

		const { literal } = node;
		const isNumber = TsAST.isNumericLiteral(literal)
			|| (
				TsAST.isPrefixUnaryExpression(literal)
				&& literal.operator === TsAST.SyntaxKind.MinusToken
				&& TsAST.isNumericLiteral(literal.operand)
			);

		if (!isNumber) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.float64,
		});
	},
);

import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

// Un type littéral numérique (`3`, `-1`, inféré par exemple pour success(3)
// avec `const V`) a la même représentation à l'exécution qu'un number : float64.
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

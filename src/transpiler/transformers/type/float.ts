import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

/**
 * Un type TypeScript dont toutes les valeurs sont des nombres :
 * - `number`
 * - un littéral numérique (`3`, `-1`) que le checker peut produire
 * - un nombre « brandé » `number & DNumber.Positive` : la contrainte DuploJS
 *   n'existe que dans les types, la valeur reste un nombre
 * - une union de ces types : `1 | 2 | 3`
 */
function isNumberTypeNode(node: TsAST.Node): boolean {
	return node.kind === TsAST.SyntaxKind.NumberKeyword
		|| (
			TsAST.isLiteralTypeNode(node)
			&& (
				TsAST.isNumericLiteral(node.literal)
				|| (TsAST.isPrefixUnaryExpression(node.literal) && TsAST.isNumericLiteral(node.literal.operand))
			)
		)
		|| (TsAST.isParenthesizedTypeNode(node) && isNumberTypeNode(node.type))
		|| (
			TsAST.isIntersectionTypeNode(node)
			&& node.types.some((member) => member.kind === TsAST.SyntaxKind.NumberKeyword)
		)
		|| (TsAST.isUnionTypeNode(node) && node.types.every(isNumberTypeNode));
}

/**
 * Types numériques → `float64` (IEEE 754 double précision, comme `number`).
 */
export const float64TypeTransformer: Transformer<GoAST.BuiltinTypeReference<"float64">> = createTransformer(
	(node, context) => {
		if (!isNumberTypeNode(node)) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.float64,
		});
	},
);

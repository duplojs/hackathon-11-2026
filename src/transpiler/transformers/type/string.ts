import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

/**
 * Un type TypeScript dont toutes les valeurs sont des chaînes :
 * - `string`
 * - un littéral `"negative-operand"` (le checker garde souvent le littéral exact)
 * - un template `${3}` (type de retour de `DString.to` sur un littéral)
 * - un string « brandé » `string & Number` (type de retour de `DString.to` sur un `number`) :
 *   la marque n'existe que dans les types, la valeur reste une chaîne
 * - une union de ces types : `"a" | "b"`, `string | (string & Number)` (résultat de `matchInformation`)
 */
function isStringTypeNode(node: TsAST.Node): boolean {
	return node.kind === TsAST.SyntaxKind.StringKeyword
		|| TsAST.isTemplateLiteralTypeNode(node)
		|| (TsAST.isLiteralTypeNode(node) && TsAST.isStringLiteral(node.literal))
		|| (TsAST.isParenthesizedTypeNode(node) && isStringTypeNode(node.type))
		|| (
			TsAST.isIntersectionTypeNode(node)
			&& node.types.some((member) => member.kind === TsAST.SyntaxKind.StringKeyword)
		)
		|| (TsAST.isUnionTypeNode(node) && node.types.every(isStringTypeNode));
}

/**
 * Types textuels → `string`.
 * Go n'a pas de types littéraux ni de marques : TypeScript a déjà vérifié la valeur exacte.
 */
export const stringTypeTransformer: Transformer<GoAST.BuiltinTypeReference<"string">> = createTransformer(
	(node, context) => {
		if (!isStringTypeNode(node)) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.string,
		});
	},
);

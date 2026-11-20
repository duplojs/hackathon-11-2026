import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

/**
 * Type littéral chaîne (`"3"`, `` `${3}` ``) -> `string`.
 *
 * `DString.to(3)` a pour type le littéral `"3"`. Go n'a pas de types littéraux :
 * la valeur reste une string comme les autres.
 */
export const stringLiteralTypeTransformer: Transformer<GoAST.BuiltinTypeReference<"string">> = createTransformer(
	(node, context) => {
		const isStringLiteral = (TsAST.isLiteralTypeNode(node) && TsAST.isStringLiteral(node.literal))
			|| TsAST.isTemplateLiteralTypeNode(node);

		if (!isStringLiteral) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.string,
		});
	},
);

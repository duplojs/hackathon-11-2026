import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

// `string`, les types littéraux chaîne (`"success"`, inférés par exemple pour
// print("hello")) et les types gabarits (`` `trop grand : ${string}` ``) ont la même
// représentation à l'exécution : string.
export const stringTypeTransformer: Transformer<GoAST.BuiltinTypeReference<"string">> = createTransformer(
	(node, context) => {
		const isString = node.kind === TsAST.SyntaxKind.StringKeyword
			|| TsAST.isTemplateLiteralTypeNode(node)
			|| (
				TsAST.isLiteralTypeNode(node)
				&& (
					TsAST.isStringLiteral(node.literal)
					|| TsAST.isNoSubstitutionTemplateLiteral(node.literal)
				)
			);

		if (!isString) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.string,
		});
	},
);

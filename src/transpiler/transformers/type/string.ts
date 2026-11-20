import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

// Le texte d'une chaîne est conservé ; seule sa représentation interne diffère (UTF-8 en Go, UTF-16 en JavaScript).
export const stringTypeTransformer: Transformer<GoAST.BuiltinTypeReference<"string">> = createTransformer(
	(node, context) => {
		if (node.kind !== TsAST.SyntaxKind.StringKeyword) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.string,
		});
	},
);

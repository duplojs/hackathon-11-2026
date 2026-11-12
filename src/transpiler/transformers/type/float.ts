import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

export const float64TypeTransformer: Transformer<GoAST.BuiltinTypeReference<"float64">> = createTransformer(
	(node, context) => {
		if (
			!TsAST.isKeywordTypeNode(node)
			&& node.kind === TsAST.SyntaxKind.NumberKeyword
		) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.float64,
		});
	},
);

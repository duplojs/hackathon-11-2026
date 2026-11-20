import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";

/** `boolean` -> `bool`. */
export const booleanTypeTransformer: Transformer<GoAST.BuiltinTypeReference<"bool">> = createTransformer(
	(node, context) => {
		if (node.kind !== TsAST.SyntaxKind.BooleanKeyword) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.bool,
		});
	},
);

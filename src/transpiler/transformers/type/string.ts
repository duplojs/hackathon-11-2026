import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";

/** `string` -> `string`. */
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

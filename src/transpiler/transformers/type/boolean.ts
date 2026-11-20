import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

// `boolean`, `true` et `false` donnent bool. Une union `true | false` est
// regroupée en bool par le transformer d'union.
export const booleanTypeTransformer: Transformer<GoAST.BuiltinTypeReference<"bool">> = createTransformer(
	(node, context) => {
		const isBoolean = node.kind === TsAST.SyntaxKind.BooleanKeyword
			|| (
				TsAST.isLiteralTypeNode(node)
				&& (
					node.literal.kind === TsAST.SyntaxKind.TrueKeyword
					|| node.literal.kind === TsAST.SyntaxKind.FalseKeyword
				)
			);

		if (!isBoolean) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.bool,
		});
	},
);

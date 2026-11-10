import * as GO from "@go";
import * as TS from "typescript/ast";
import { createTransformer, type Transformer } from "../../factory";

export const numberTypeTransformer: Transformer<GO.AST.BuiltinTypeReference<"float64">> = createTransformer(
	(node, context) => {
		if (node.kind !== TS.SyntaxKind.NumberKeyword) {
			return context.notSupport(node);
		}

		return context.success({
			result: GO.AST.builtinTypeReferences.float64,
		});
	},
);

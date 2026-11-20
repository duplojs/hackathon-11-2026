import type { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";

// `readonly T[]` et `readonly [T, T]` : readonly est une garantie de typage TS
// sans représentation à l'exécution ; on traduit le type interne.
export const readonlyTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	(node, context) => {
		if (
			!TsAST.isTypeOperatorNode(node)
			|| node.operator !== TsAST.SyntaxKind.ReadonlyKeyword
		) {
			return context.notSupport();
		}

		return context.transform(node.type, typeTransformers.value);
	},
);

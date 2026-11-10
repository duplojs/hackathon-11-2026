import * as DCommon from "@duplojs/lang/common";
import * as DObject from "@duplojs/lang/object";
import * as GO from "@go";
import * as TS from "typescript/ast";
import { createTransformer, type Transformer } from "../../factory";

export const numberTypeTransformer: Transformer<GO.AST.DefaultTypeReference<"float64">> = createTransformer(
	(node, context) => {
		if (!(
			TS.isKeywordTypeNode(node)
			&& DObject.discriminate(node, "kind", DCommon.equal(TS.SyntaxKind.NumberKeyword))
		)) {
			return context.notSupport(node);
		}

		return context.success({
			result: GO.AST.defaultTypeReferences.float64,
		});
	},
);

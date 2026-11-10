import * as GO from "@go";
import * as TS from "typescript/ast";
import { createTransformer, type Transformer } from "../../factory";

export const numericLiteralTransformer: Transformer<GO.AST.ConversionExpression> = createTransformer(
	(node, context) => {
		if (!TS.isNumericLiteral(node)) {
			return context.notSupport(node);
		}

		return context.success({
			result: GO.AST.conversionExpression({
				typeReference: GO.AST.builtinTypeReferences.float64,
				operand: GO.AST.floatLiteral({ value: node.text }),
			}),
		});
	},
);

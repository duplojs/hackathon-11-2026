import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DPattern from "@duplojs/lang/pattern";
import { printExpressionHandler } from "./print";
import { pipeExpressionHandler } from "./pipe";

/** Routeur des fonctions de `@duplojs/lang/common` (print, pipe...). */
export const duploJSCommonExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		const reference = TsAST.isCallExpression(node)
			? node.expression
			: node;

		if (
			!TsAST.isIdentifier(reference)
			&& !TsAST.isPropertyAccessExpression(reference)
		) {
			return context.notSupport();
		}

		const moduleReference = await DCommon.asyncPipe(
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/common\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("print"),
				() => printExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("pipe"),
				() => pipeExpressionHandler(node, context),
			),
			DPattern.otherwise(
				() => context.error(node, "common-function-not-supported-yet"),
			),
		);
	},
);

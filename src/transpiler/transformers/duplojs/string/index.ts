import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPattern from "@duplojs/lang/pattern";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import { toExpressionHandler } from "./to";
import { testExpressionHandler } from "./test";
import { includesExpressionHandler } from "./includes";
import { lengthExpressionHandler } from "./length";

/**
 * Routeur du domaine `@duplojs/lang/string`.
 */
export const duploJSStringExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
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
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/string\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("to"),
				() => toExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("test"),
				() => testExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("includes"),
				() => includesExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("length"),
				() => lengthExpressionHandler(node, context),
			),
			DPattern.otherwise(
				() => context.error(node),
			),
		);
	},
);

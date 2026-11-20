import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPattern from "@duplojs/lang/pattern";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import { coalescingExpressionHandler } from "./coalescing";
import { mapExpressionHandler } from "./map";

/**
 * Routeur du domaine `@duplojs/lang/array`.
 */
export const duploJSArrayExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
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
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/array\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("coalescing"),
				() => coalescingExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("map"),
				() => mapExpressionHandler(node, context),
			),
			DPattern.otherwise(
				() => context.error(node),
			),
		);
	},
);

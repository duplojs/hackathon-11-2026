import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { TsAST } from "@typescript";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { coalescingExpressionHandler } from "./coalescing";
import { mapExpressionHandler } from "./map";

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

		if (moduleReference.symbol.name === "coalescing") {
			return coalescingExpressionHandler.transformer(node, context);
		}

		if (moduleReference.symbol.name === "map") {
			return mapExpressionHandler(node, context);
		}

		return context.error(node);
	},
);

import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPattern from "@duplojs/lang/pattern";
import { createTransformer, type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { toExpressionHandler } from "./to";
import { testExpressionHandler } from "./test";
import { stringCallHandler } from "./call";
import { stringDependency, stringIncludesIdentifier, stringLengthIdentifier } from "./sharedDependency";

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
			// `includes` (garde de type) et `length` : fonctions du runtime partagé.
			DPattern.match(
				DCommon.equal("includes"),
				() => stringCallHandler(
					node,
					context,
					2,
					(goArguments) => GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target: context.registerSharedDependency(stringDependency.value),
							identifier: stringIncludesIdentifier,
						}),
						arguments: goArguments,
					}),
				),
			),
			DPattern.match(
				DCommon.equal("length"),
				() => stringCallHandler(
					node,
					context,
					1,
					(goArguments) => GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target: context.registerSharedDependency(stringDependency.value),
							identifier: stringLengthIdentifier,
						}),
						arguments: goArguments,
					}),
				),
			),
			DPattern.otherwise(
				() => context.error(node, "duplojs-string-function-not-supported"),
			),
		);
	},
);

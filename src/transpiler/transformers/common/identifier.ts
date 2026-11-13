import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

export const identifierTransformer: Transformer<GoAST.Identifier | GoAST.SelectorExpression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIdentifier(node)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			await context.resolveDependencyFile(node),
			DEither.matchInformation({
				none: () => context.success({
					result: context.createSourceIdentifier(node.text),
				}),
				some: (dependencyFile) => {
					const packageIdentifier = context.registerDependencyFile(dependencyFile);
					const memberIdentifier = context.createSourceIdentifier(node.text);

					return context.success({
						result: GoAST.createSelectorExpression({
							target: packageIdentifier,
							identifier: memberIdentifier,
						}),
					});
				},
			}),
		);
	},
);

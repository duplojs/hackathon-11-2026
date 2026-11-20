import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { SymbolFlags } from "typescript/async";
import { narrowToCheckerType } from "../type";

export const identifierTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIdentifier(node)) {
			return context.notSupport();
		}

		const reference = DCommon.pipe(
			await context.resolveDependencyFile(node),
			DEither.matchInformation({
				none: () => context.createSourceIdentifier(node.text),
				some: (dependencyFile): GoAST.Expression => GoAST.createSelectorExpression({
					target: context.registerDependencyFile(dependencyFile),
					identifier: context.createSourceIdentifier(node.text),
				}),
			}),
		);

		const { typeChecker } = context.transpilation;
		const symbol = await typeChecker.getSymbolAtLocation(node);

		if (!symbol) {
			return context.success({ result: reference });
		}

		const declaredSymbol = symbol.flags & SymbolFlags.Alias
			? await typeChecker.getAliasedSymbol(symbol)
			: symbol;

		// Un garde de type (`if (isRight(x))`) rétrécit le type TypeScript de `x` à cet endroit ;
		// la variable Go conserve sa représentation déclarée et doit être adaptée.
		const narrowed = await narrowToCheckerType({
			expression: reference,
			declared: await typeChecker.getTypeOfSymbol(declaredSymbol),
			narrowed: await typeChecker.getTypeAtLocation(node),
			location: node,
			context,
		});

		if (DEither.isLeft(narrowed)) {
			return narrowed;
		}

		return context.success({ result: DEither.unwrapRight(narrowed) });
	},
);

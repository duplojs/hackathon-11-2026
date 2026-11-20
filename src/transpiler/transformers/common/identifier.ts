import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { SymbolFlags } from "typescript/async";
import { transformCheckerType } from "../type/fromChecker";
import { isEitherType } from "../duplojs/either/isEitherType";

export const identifierTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIdentifier(node)) {
			return context.notSupport();
		}

		const { typeChecker } = context.transpilation;

		const nodeSymbol = await typeChecker.getSymbolAtLocation(node);
		const resolvedSymbol = nodeSymbol && (nodeSymbol.flags & SymbolFlags.Alias)
			? await typeChecker.getAliasedSymbol(nodeSymbol)
			: nodeSymbol;

		const isUnwrapped = (nodeSymbol && context.file.unwrappedVariables.has(nodeSymbol))
			|| (resolvedSymbol && context.file.unwrappedVariables.has(resolvedSymbol));

		if (isUnwrapped) {
			const typeAtLoc = await typeChecker.getTypeAtLocation(node);
			const isEither = await isEitherType(typeAtLoc, node, context);

			if (!isEither) {
				const baseIdent = context.createSourceIdentifier(node.text);
				let typeRef: GoAST.Type | GoAST.TypeReference = GoAST.builtinTypeReferences.any;
				const transformedType = await DCommon.asyncPipe(
					transformCheckerType(typeAtLoc, node, context),
					DEither.unwrapRight,
				);
				if (!DEither.isLeft(transformedType)) {
					typeRef = transformedType.result;
				}

				return context.success({
					result: GoAST.createTypeAssertionExpression({
						target: GoAST.createCallExpression({
							callee: GoAST.createSelectorExpression({
								target: baseIdent,
								identifier: GoAST.createIdentifier("GetValue"),
							}),
							arguments: [],
						}),
						typeReference: typeRef,
					}),
				});
			}
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

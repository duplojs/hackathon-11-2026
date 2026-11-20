import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from "../expression";

/**
 * `const name = expression;` → `Sourced_name := expression`.
 * Le type Go est inféré depuis l'expression, déjà traduite avec son type.
 * Limites : une seule déclaration par instruction, nom simple (pas de
 * déstructuration), initialiseur obligatoire.
 */
export const variableStatementTransformer: Transformer<GoAST.ShortVariableDeclarationStatement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isVariableStatement(node)) {
			return context.notSupport();
		}

		const declaration = DArray.first(node.declarationList.declarations);

		if (
			!declaration
			|| node.declarationList.declarations.length !== 1
			|| !TsAST.isIdentifier(declaration.name)
			|| !declaration.initializer
		) {
			return context.notSupport();
		}

		if (TsAST.isCallExpression(declaration.initializer)) {
			for (const arg of declaration.initializer.arguments) {
				if (TsAST.isPropertyAccessExpression(arg) || TsAST.isIdentifier(arg)) {
					const modRef = await DCommon.asyncPipe(
						context.resolveReferenceModule(arg, "@duplojs/lang", /^dist\/either\//),
						DEither.unwrapRight,
					);
					if (!DEither.isLeft(modRef) && modRef.exportName === "unwrapRight") {
						const sym = await context.transpilation.typeChecker.getSymbolAtLocation(declaration.name);
						if (sym) {
							context.file.unwrappedVariables.add(sym);
						}
					}
				}
			}
		}

		const initializer = await DCommon.asyncPipe(
			context.transform(declaration.initializer, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(initializer)) {
			return initializer;
		}

		return context.success({
			before: initializer.before,
			result: GoAST.createShortVariableDeclarationStatement({
				identifier: context.createSourceIdentifier(declaration.name.text),
				initializer: initializer.result,
			}),
		});
	},
);

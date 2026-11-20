import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { expressionTransformers } from "../expression";
import { convertToCheckerType, transformCheckerType } from "../type";

interface TranslatedDeclaration {
	readonly before: readonly GoAST.Statement[];
	readonly packageDeclaration: GoAST.VariableDeclarationZeroValue | undefined;
	readonly statement: GoAST.AssignmentStatement | GoAST.VariableDeclarationInitialized;
}

// Une variable de module devient une variable de package affectée dans `init` : elle reste
// accessible depuis les autres fichiers et n'est pas soumise à l'erreur Go des variables
// inutilisées. Une variable locale devient une déclaration typée dans son bloc.
// Le type Go est celui déclaré par TypeScript (et non celui de l'initialiseur), ce qui
// permet de placer la valeur dans l'union attendue.
export const variableStatementTransformer: Transformer<
	| GoAST.AssignmentStatement
	| GoAST.VariableDeclarationInitialized
> = createTransformer(
	async(node, context) => {
		if (!TsAST.isVariableStatement(node)) {
			return context.notSupport();
		}

		const isPackageLevel = TsAST.isSourceFile(node.parent);
		const { typeChecker } = context.transpilation;

		const declarations = await DCommon.asyncPipe(
			node.declarationList.declarations,
			DArray.map(
				async(declaration) => {
					if (!TsAST.isIdentifier(declaration.name)) {
						return context.error(declaration, "variable-name-is-not-identifier");
					}

					if (!declaration.initializer) {
						return context.error(declaration, "variable-without-initializer-not-supported");
					}

					const declaredType = await typeChecker.getTypeAtLocation(declaration.name);

					const typeReference = await transformCheckerType(declaredType, declaration, context);

					if (DEither.isLeft(typeReference)) {
						return typeReference;
					}

					const initializer = await DCommon.asyncPipe(
						context.transform(declaration.initializer, expressionTransformers.value),
						DEither.unwrapRight,
					);

					if (DEither.isLeft(initializer)) {
						return initializer;
					}

					const value = await convertToCheckerType({
						expression: initializer.result,
						source: await typeChecker.getTypeAtLocation(declaration.initializer),
						target: declaredType,
						location: declaration,
						context,
					});

					if (DEither.isLeft(value)) {
						return value;
					}

					const identifier = context.createSourceIdentifier(declaration.name.text);

					return DEither.success<TranslatedDeclaration>(
						isPackageLevel
							? {
								before: initializer.before,
								packageDeclaration: GoAST.createVariableDeclarationZeroValue({
									identifier,
									typeReference: DEither.unwrapRight(typeReference),
								}),
								statement: GoAST.createAssignmentStatement({
									targets: DCommon.cast([identifier]),
									values: DCommon.cast([DEither.unwrapRight(value)]),
								}),
							}
							: {
								before: initializer.before,
								packageDeclaration: undefined,
								statement: GoAST.createVariableDeclarationInitialized({
									identifier,
									typeReference: DEither.unwrapRight(typeReference),
									initializer: DEither.unwrapRight(value),
								}),
							},
					);
				},
			),
			DCommon.promiseAll,
			// Plusieurs déclarations dans une même instruction : les premières sont émises avant la dernière.
			DArray.reduce(
				DArray.reduceFrom<{
					before: readonly GoAST.Statement[];
					statement: TranslatedDeclaration["statement"] | undefined;
					packageDeclarations: readonly GoAST.VariableDeclarationZeroValue[];
				}>({
					before: [],
					statement: undefined,
					packageDeclarations: [],
				}),
				({ element, lastValue, next, exit }) => {
					if (DEither.isLeft(element)) {
						return exit(element);
					}

					const translated = DEither.unwrapRight(element);

					return next({
						before: DArray.concat(
							lastValue.before,
							lastValue.statement ? [lastValue.statement] : [],
							translated.before,
						),
						statement: translated.statement,
						packageDeclarations: translated.packageDeclaration
							? DArray.push(lastValue.packageDeclarations, translated.packageDeclaration)
							: lastValue.packageDeclarations,
					});
				},
			),
		);

		if (DEither.isLeft(declarations)) {
			return declarations;
		}

		if (!declarations.statement) {
			return context.error(node, "variable-statement-without-declaration");
		}

		// Les ensembles du contexte ne sont modifiés qu'une fois toutes les déclarations traduites.
		DCommon.pipe(
			declarations.packageDeclarations,
			DGenerator.map((packageDeclaration) => context.file.declarations.add(packageDeclaration)),
			DGenerator.execute,
		);

		return context.success({
			before: declarations.before,
			result: declarations.statement,
		});
	},
);

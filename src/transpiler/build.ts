import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import type * as DInvocation from "@duplojs/lang/invocation";
import * as DPath from "@duplojs/lang/path";
import { GoAST, GoPrinter } from "@go";
import type { createTypescriptInstance } from "./createTypescriptInstance";
import { createTranspilationContext, type TranspilationContext } from "./context/transpilation";
import { createInitIdentifier, transformSourceFile } from "./transformSourceFile";
import { createFile, type CreateFileParams } from "./createFile";
import { toDPathAbsolute, toNativePath } from "./path";
import { sharedDependencyPackageName } from "@transformer";
import { createFilePackageLayout, goModuleContent } from "./sourcePackage";
import { createModuleGraph, isMergedPackage } from "./moduleGraph";
import { createSourcePackageIdentifier } from "./context/build";
import { defaultSharedDependencies } from "./sharedDependency/defaults";

// D9 : plusieurs dépendances partagées (par défaut ou enregistrées à la
// demande) peuvent importer le même package Go (ex. "strconv" pour
// l'inspection et pour une future conversion numérique). Go refuse un
// import dupliqué dans un même fichier ; on ne garde que la première
// occurrence de chaque chemin d'import, dans l'ordre d'arrivée.
function dedupeImportsByPath(
	imports: readonly GoAST.ImportDeclaration[],
): readonly GoAST.ImportDeclaration[] {
	return DCommon.pipe(
		imports,
		DArray.reduce(
			DArray.reduceFrom<{
				seenPaths: ReadonlySet<string>;
				result: readonly GoAST.ImportDeclaration[];
			}>({
				seenPaths: new Set(),
				result: [],
			}),
			({ element, lastValue, nextWithObject }) => lastValue.seenPaths.has(element.path)
				? nextWithObject(lastValue, lastValue)
				: nextWithObject(lastValue, {
					seenPaths: new Set([...lastValue.seenPaths, element.path]),
					result: DArray.push(lastValue.result, element),
				}),
		),
		({ result }) => result,
	);
}

/**
 * Fichier qui appelle, dans l'ordre d'évaluation ES, les fonctions
 * d'initialisation des fichiers d'un package fusionné (cycle d'imports).
 */
function createInitOrderFiles(
	context: TranspilationContext,
	filesWithInit: ReadonlySet<string>,
) {
	const files = [];

	for (const [representative, members] of context.moduleGraph.packageMembers) {
		if (members.length < 2) {
			continue;
		}

		const calls = DArray.filter(members, (member) => filesWithInit.has(member));

		if (DArray.lengthEqual(calls, 0)) {
			continue;
		}

		const layout = DEither.unwrapRight(
			createFilePackageLayout(
				context.projectWorkDirectory,
				context.moduleGraph,
				representative as string & DPath.Absolute,
			),
		);

		if (DEither.isLeft(layout)) {
			return layout;
		}

		const outputPath = DEither.unwrapRight(DPath.create(`${layout.packageDirectory}/zz_init_order.go`));

		if (DEither.isLeft(outputPath)) {
			return outputPath;
		}

		files.push({
			representative,
			outputPath,
			statements: DArray.map(
				calls,
				(member) => GoAST.createCallExpression({
					callee: createInitIdentifier(context, member as string & DPath.Absolute),
					arguments: [],
				}),
			),
		});
	}

	return DEither.success(files);
}

export async function *build(
	typescriptInstance: DInvocation.GetEvidenceResult<
		typeof createTypescriptInstance,
		"typescript-instance"
	>,
	input: string & DPath.Absolute,
) {
	const entrySourceFile = await typescriptInstance.project.program.getSourceFile(toNativePath(input));
	const entryPath = entrySourceFile && DEither.unwrapRight(toDPathAbsolute(entrySourceFile.path));

	if (!entryPath || DEither.isLeft(entryPath)) {
		yield DEither.left("source-file-not-found", input);
		return;
	}

	const context = createTranspilationContext({
		typeChecker: typescriptInstance.project.checker,
		projectWorkDirectory: typescriptInstance.projectWorkDirectory,
		moduleGraph: await createModuleGraph({
			program: typescriptInstance.project.program,
			checker: typescriptInstance.project.checker,
			entry: entryPath,
			projectWorkDirectory: typescriptInstance.projectWorkDirectory,
		}),
	});
	const filesWithInit = new Set<string>();

	yield *DGenerator.asyncLoopAccumulator(
		DGenerator.loopAccumulatorFrom<{
			pending: readonly string[];
			built: Set<string>;
		}>({
			pending: [input],
			built: new Set(),
		}),
		async({ accumulator, next, exit }) => {
			const path = DArray.first(accumulator.pending);

			if (path === undefined) {
				const entryPackage = DEither.unwrapRight(
					createFilePackageLayout(typescriptInstance.projectWorkDirectory, context.moduleGraph, entryPath),
				);

				if (DEither.isLeft(entryPackage)) {
					return exit(entryPackage);
				}

				const initOrderFiles = DEither.unwrapRight(createInitOrderFiles(context, filesWithInit));

				if (DEither.isLeft(initOrderFiles)) {
					return exit(initOrderFiles);
				}

				const initOrderOutputs = DArray.map(
					initOrderFiles,
					(initOrderFile) => DEither.right("build-init-order-file", {
						content: GoPrinter.printGoFile(createFile({
							packageName: createSourcePackageIdentifier(
								initOrderFile.representative as string & DPath.Absolute,
								typescriptInstance.projectWorkDirectory,
							),
							imports: [],
							declarations: [],
							init: initOrderFile.statements,
						})),
						outputPath: initOrderFile.outputPath,
					}),
				);

				const mainFile = DEither.right("build-main-file", {
					content: GoPrinter.printGoFile(GoAST.createGoFile({
						packageName: GoAST.createIdentifier("main"),
						imports: [
							GoAST.createImportDeclaration({
								path: entryPackage.importPath,
								alias: GoAST.createIdentifier("_"),
							}),
						],
						declarations: [
							GoAST.createFunctionDeclaration({
								identifier: GoAST.createIdentifier("main"),
								generic: [],
								arguments: [],
								returnTypes: [],
								body: GoAST.createBlockStatement({ statements: [] }),
							}),
						],
					})),
					outputPath: DPath.declarePath("main.go"),
				});
				const moduleFile = DEither.right("build-go-module-file", {
					content: goModuleContent,
					outputPath: DPath.declarePath("go.mod"),
				});

				if (context.sharedDependencies.size === 0) {
					return exit(mainFile, moduleFile, ...initOrderOutputs);
				}

				const file = DCommon.pipe(
					new Set([
						...defaultSharedDependencies.value,
						...context.sharedDependencies,
					]),
					DGenerator.reduce(
						DGenerator.reduceFrom<CreateFileParams>({
							packageName: sharedDependencyPackageName,
							imports: [],
							declarations: [],
							init: [],
						}),
						({ item, lastValue, nextWithObject }) => nextWithObject(
							lastValue,
							{
								imports: DArray.concat(lastValue.imports, item.imports),
								declarations: DArray.concat(
									lastValue.declarations,
									item.declarations,
								),
								init: DArray.concat(lastValue.init, item.init),
							},
						),
					),
					(params) => ({
						...params,
						imports: dedupeImportsByPath(params.imports),
					}),
					createFile,
				);

				return exit(
					DEither.right("build-shared-dependencies-file", {
						content: GoPrinter.printGoFile(file),
						outputPath: DPath.declarePath(
							`${sharedDependencyPackageName.value}/${sharedDependencyPackageName.value}.go`,
						),
					}),
					mainFile,
					moduleFile,
					...initOrderOutputs,
				);
			}

			const sourceFile = await typescriptInstance.project.program.getSourceFile(
				toNativePath(path),
			);

			if (!sourceFile) {
				return exit(DEither.left("source-file-not-found", path));
			}

			if (accumulator.built.has(sourceFile.path)) {
				return next({
					...accumulator,
					pending: DArray.shift(accumulator.pending),
				});
			}

			const pendingRest = DArray.shift(accumulator.pending);

			const transformed = await transformSourceFile(sourceFile, context);

			if (DEither.isLeft(transformed)) {
				return exit(transformed);
			}

			const sourcePath = DEither.unwrapRight(toDPathAbsolute(sourceFile.path));

			if (DEither.isLeft(sourcePath)) {
				return exit(sourcePath);
			}

			const sourcePackage = DEither.unwrapRight(
				createFilePackageLayout(typescriptInstance.projectWorkDirectory, context.moduleGraph, sourcePath),
			);

			if (DEither.isLeft(sourcePackage)) {
				return exit(sourcePackage);
			}

			const result = DEither.unwrapRight(transformed);
			accumulator.built.add(sourceFile.path);

			if (result.hasInit) {
				filesWithInit.add(sourceFile.path);
			}

			// Package fusionné : ses autres fichiers sont référencés sans import.
			const packageMembers = isMergedPackage(context.moduleGraph, sourcePath)
				? context.moduleGraph.packageMembers.get(context.moduleGraph.packageOf.get(sourcePath)!) ?? []
				: [];

			return next(
				{
					pending: [...pendingRest, ...result.context.file.dependencyFiles, ...packageMembers],
					built: accumulator.built,
				},
				DEither.right("build-source-file", {
					content: GoPrinter.printGoFile(result.file),
					outputPath: sourcePackage.outputPath,
				}),
			);
		},
	);
}

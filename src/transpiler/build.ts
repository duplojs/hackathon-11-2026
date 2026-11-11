import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import type * as DInvocation from "@duplojs/lang/invocation";
import * as DPath from "@duplojs/lang/path";
import * as GO from "@go";
import type { createTypescriptInstance } from "./createTypescriptInstance";
import { createTranspilationContext } from "./context/transpilation";
import { transformSourceFile } from "./transformSourceFile";
import { createFile, type CreateFileParams } from "./createFile";
import { sharedDependencyPackageName } from "./sharedDependency";
import { createSourcePackageLayout, goModuleContent } from "./sourcePackage";

export function build(
	typescriptInstance: DInvocation.GetEvidenceResult<
		typeof createTypescriptInstance,
		"typescript-instance"
	>,
	input: string & DPath.Absolute,
) {
	const context = createTranspilationContext({
		typeChecker: typescriptInstance.project.checker,
		projectWorkDirectory: typescriptInstance.projectWorkDirectory,
	});

	return DGenerator.asyncLoopAccumulator(
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
				const entryPackage = DCommon.pipe(
					DEither.rightPipe(
						DPath.createAbsolute(typescriptInstance.api.getCanonicalFileName(input)),
						(sourcePath) => createSourcePackageLayout(typescriptInstance.projectWorkDirectory, sourcePath),
					),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(entryPackage)) {
					return exit(entryPackage);
				}

				const mainFile = DEither.right("build-main-file", {
					content: GO.Printer.printGoFile(GO.AST.goFile({
						packageName: GO.AST.createIdentifier("main"),
						imports: [
							GO.AST.importDeclaration({
								path: entryPackage.importPath,
								alias: GO.AST.createIdentifier("_"),
							}),
						],
						topLevelDeclarations: [
							GO.AST.functionDeclaration({
								identifier: GO.AST.createIdentifier("main"),
								generic: [],
								parameters: [],
								returnTypes: [],
								body: GO.AST.blockStatement({ statements: [] }),
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
					return exit(mainFile, moduleFile);
				}

				const file = DCommon.pipe(
					context.sharedDependencies,
					DGenerator.reduce(
						DGenerator.reduceFrom<CreateFileParams>({
							packageName: sharedDependencyPackageName,
							imports: [],
							topLevelDeclaration: [],
							init: [],
						}),
						({ item, lastValue, nextWithObject }) => nextWithObject(
							lastValue,
							{
								imports: DArray.concat(lastValue.imports, item.imports),
								topLevelDeclaration: DArray.concat(
									lastValue.topLevelDeclaration,
									item.topLevelDeclarations,
								),
								init: DArray.concat(lastValue.init, item.init),
							},
						),
					),
					createFile,
				);

				return exit(
					DEither.right("build-shared-dependencies-file", {
						content: GO.Printer.printGoFile(file),
						outputPath: DPath.declarePath(
							`${sharedDependencyPackageName.value}/${sharedDependencyPackageName.value}.go`,
						),
					}),
					mainFile,
					moduleFile,
				);
			}

			const sourceFile = await typescriptInstance.project.program.getSourceFile(path);

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

			const sourcePackage = DCommon.pipe(
				DEither.rightPipe(
					DPath.createAbsolute(sourceFile.path),
					(sourcePath) => createSourcePackageLayout(typescriptInstance.projectWorkDirectory, sourcePath),
				),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(sourcePackage)) {
				return exit(sourcePackage);
			}

			const result = DEither.unwrapRight(transformed);
			accumulator.built.add(sourceFile.path);

			return next(
				{
					pending: [...pendingRest, ...result.context.file.dependencyFiles],
					built: accumulator.built,
				},
				DEither.right("build-source-file", {
					content: GO.Printer.printGoFile(result.file),
					outputPath: sourcePackage.outputPath,
				}),
			);
		},
	);
}

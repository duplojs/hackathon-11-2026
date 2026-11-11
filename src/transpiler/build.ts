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

export function build(
	typescriptInstance: DInvocation.GetEvidenceResult<
		typeof createTypescriptInstance,
		"typescript-instance"
	>,
	input: string & DPath.Absolute,
) {
	const context = createTranspilationContext({
		typeChecker: typescriptInstance.project.checker,
		projectWorkDirectory: typescriptInstance.workDirectory,
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
				if (context.sharedDependencies.size === 0) {
					return exit();
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
						file,
						outputPath: DPath.declarePath(`${sharedDependencyPackageName.value}.go`),
					}),
				);
			}

			const sourceFile = await typescriptInstance.project.program.getSourceFile(path);

			if (!sourceFile) {
				return exit(DEither.left("source-file-not-found", path));
			}

			if (accumulator.built.has(sourceFile.path)) {
				return next(accumulator);
			}

			const pendingRest = DArray.shift(accumulator.pending);

			const transformed = await transformSourceFile(sourceFile, context);

			if (DEither.isLeft(transformed)) {
				return exit(transformed);
			}

			const outputPath = DCommon.pipe(
				DEither.rightPipe(
					DPath.createAbsolute(sourceFile.fileName),
					(sourcePath) => DPath.computeRelative(typescriptInstance.workDirectory, sourcePath),
					(relativePath) => DPath.create(`${relativePath}.go`),
				),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(outputPath)) {
				return exit(outputPath);
			}

			const result = DEither.unwrapRight(transformed);
			accumulator.built.add(sourceFile.path);

			return next(
				{
					pending: [...pendingRest, ...result.context.file.dependencyFiles],
					built: accumulator.built,
				},
				DEither.right("build-source-file", {
					file: result.file,
					outputPath,
				}),
			);
		},
	);
}

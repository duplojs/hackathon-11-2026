import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import type * as DInvocation from "@duplojs/lang/invocation";
import * as DPath from "@duplojs/lang/path";
import * as GO from "@go";
import type { createTypescriptInstance } from "./createTypescriptInstance";
import { createTranspilationContext, type Dependencies } from "./context/transpilation";
import { transformSourceFile } from "./transformSourceFile";

function createDependenciesFile(dependencies: Dependencies) {
	const content = DCommon.pipe(
		dependencies.dependencies,
		DGenerator.reduce(
			DGenerator.reduceFrom<Pick<GO.AST.GoFile, "imports" | "declarations" | "init">>({
				imports: [],
				declarations: [],
				init: [],
			}),
			({ item, lastValue, next }) => next({
				imports: [...lastValue.imports, ...item.imports],
				declarations: [...lastValue.declarations, ...item.topLevelDeclarations],
				init: [...lastValue.init, ...item.init],
			}),
		),
	);

	return GO.AST.goFile({
		packageName: GO.AST.createIdentifier("generated"),
		...content,
	});
}

export function build(
	typescriptInstance: DInvocation.GetEvidenceResult<
		typeof createTypescriptInstance,
		"typescript-instance"
	>,
	input: string & DPath.Absolute,
) {
	const context = createTranspilationContext(typescriptInstance.project.checker);

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
				return exit(
					DEither.right("build-app-file", {
						file: createDependenciesFile(context.main),
						outputPath: DPath.declarePath("main.generated.go"),
					}),
					DEither.right("build-shared-dependencies-file", {
						file: createDependenciesFile(context.sharedDependencies),
						outputPath: DPath.declarePath("shared_dependencies.generated.go"),
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
					pending: [...pendingRest, ...result.context.file.dependencies],
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

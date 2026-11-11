import * as GO from "@go";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import * as DModeling from "@duplojs/lang/modeling";
import { type SourceFile } from "typescript/ast";
import { createBuildContext } from "./context/build";
import { createFileContext } from "./context/file";
import type { TranspilationContext } from "./context/transpilation";
import { sourceFileTransformers } from "./transformers";
import { createFile } from "./createFile";
import * as DPath from "@duplojs/lang/path";

interface TransformedFileContent {
	topLevelDeclarations: GO.AST.GoFile["topLevelDeclarations"];
	init: readonly GO.AST.Statement[];
}

export async function transformSourceFile(
	sourceFile: SourceFile,
	transpilationContext: TranspilationContext,
) {
	const fileContext = DCommon.pipe(
		createFileContext(sourceFile),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(fileContext)) {
		return fileContext;
	}
	const context = createBuildContext(transpilationContext, fileContext);

	const content = await DCommon.asyncPipe(
		sourceFile.statements,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<TransformedFileContent>({
				topLevelDeclarations: [],
				init: [],
			}),
			async({ item, lastValue, next, exit }) => {
				const statement = await DCommon.asyncPipe(
					context.transform(item, sourceFileTransformers.value),
					DEither.keepAsRightByInformation("transformation-success"),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(statement)) {
					return exit(statement);
				}

				const result = statement.result;
				const init = DArray.concat(lastValue.init, statement.before);

				if (DModeling.hasTagGroup(result, "declaration")) {
					return next({
						topLevelDeclarations: DArray.push(lastValue.topLevelDeclarations, result),
						init,
					});
				}

				return next({
					topLevelDeclarations: lastValue.topLevelDeclarations,
					init: DArray.push(init, result),
				});
			},
		),
	);

	if (DEither.isLeft(content)) {
		return content;
	}

	const imports = DCommon.pipe(
		fileContext.dependencyFiles,
		DGenerator.map(
			(path) => GO.AST.importDeclaration({
				path: DPath.computeRelative(
					fileContext.currentFilePath,
					path,
				),
			}),
		),
		DGenerator.concat(fileContext.imports),
		DArray.from,
	);

	return DEither.success({
		file: createFile({
			packageName: context.createSourceIdentifier(fileContext.currentFilePath),
			imports,
			topLevelDeclaration: DArray.concat(
				content.topLevelDeclarations,
				DArray.from(fileContext.topLevelDeclarations),
			),
			init: content.init,
		}),
		context,
	});
}

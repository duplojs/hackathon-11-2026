import { GoAST } from "@go";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import * as DModeling from "@duplojs/lang/modeling";
import { TsAST } from "@typescript";
import { createBuildContext } from "./context/build";
import { createFileContext } from "./context/file";
import type { TranspilationContext } from "./context/transpilation";
import { sourceFileTransformers } from "./transformers";
import { createFile } from "./createFile";
import { createSourcePackageLayout } from "./sourcePackage";

interface TransformedFileContent {
	declarations: GoAST.GoFile["declarations"];
	init: readonly GoAST.Statement[];
}

export async function transformSourceFile(
	sourceFile: TsAST.SourceFile,
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
				declarations: [],
				init: [],
			}),
			async({ item, lastValue, next, exit }) => {
				if (TsAST.isImportDeclaration(item)) {
					return next(lastValue);
				}

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
						declarations: DArray.push(lastValue.declarations, result),
						init,
					});
				}

				return next({
					declarations: lastValue.declarations,
					init: DArray.push(init, result),
				});
			},
		),
	);

	if (DEither.isLeft(content)) {
		return content;
	}

	const dependencyImports = DCommon.pipe(
		fileContext.dependencyFiles,
		DGenerator.reduce(
			DGenerator.reduceFrom<readonly GoAST.ImportDeclaration[]>([]),
			({ item, lastValue, next, exit }) => {
				const sourcePackage = DCommon.pipe(
					createSourcePackageLayout(transpilationContext.projectWorkDirectory, item),
					DEither.unwrapRight,
				);
				if (DEither.isLeft(sourcePackage)) {
					return exit(sourcePackage);
				}
				return next(DArray.push(lastValue, GoAST.importDeclaration({ path: sourcePackage.importPath })));
			},
		),
	);

	if (DEither.isLeft(dependencyImports)) {
		return dependencyImports;
	}

	return DEither.success({
		file: createFile({
			packageName: context.createSourceIdentifier(fileContext.currentFilePath),
			imports: DArray.concat(dependencyImports, DArray.from(fileContext.imports)),
			declarations: DArray.concat(
				content.declarations,
				DArray.from(fileContext.declarations),
			),
			init: content.init,
		}),
		context,
	});
}

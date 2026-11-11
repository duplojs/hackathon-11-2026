import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPath from "@duplojs/lang/path";
import type * as GO from "@go";
import type { SourceFile } from "typescript/ast";

export interface FileContext {
	readonly sourceFile: SourceFile;
	readonly currentFilePath: string & DPath.Absolute;
	readonly dependencyFiles: Set<string & DPath.Absolute>;
	readonly topLevelDeclarations: Set<GO.AST.TopLevelDeclaration>;
	readonly imports: Set<GO.AST.ImportDeclaration>;
}

export function createFileContext(sourceFile: SourceFile) {
	const currentFilePath = DCommon.pipe(
		sourceFile.path,
		DPath.createAbsolute,
		DEither.unwrapRight,
	);

	if (DEither.isLeft(currentFilePath)) {
		return DEither.left("invalid-current-file-path", sourceFile.path);
	}

	const context: FileContext = {
		sourceFile,
		currentFilePath,
		dependencyFiles: new Set(),
		topLevelDeclarations: new Set(),
		imports: new Set(),
	};

	return DEither.success(context);
}

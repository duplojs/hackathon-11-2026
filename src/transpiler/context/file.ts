import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPath from "@duplojs/lang/path";
import type { GoAST } from "@go";
import type { TsAST } from "@typescript";

export interface FileContext {
	readonly sourceFile: TsAST.SourceFile;
	readonly currentFilePath: string & DPath.Absolute;
	readonly dependencyFiles: Set<string & DPath.Absolute>;
	readonly declarations: Set<GoAST.Declaration>;
	readonly imports: Set<GoAST.ImportDeclaration>;
}

export function createFileContext(sourceFile: TsAST.SourceFile) {
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
		declarations: new Set(),
		imports: new Set(),
	};

	return DEither.success(context);
}

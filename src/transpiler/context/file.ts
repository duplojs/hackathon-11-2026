import type { SourceFile } from "typescript/ast";

export interface FileContext {
	readonly sourceFile: SourceFile;
}

export function createFileContext(sourceFile: SourceFile) {
	const context: FileContext = { sourceFile };

	return context;
}

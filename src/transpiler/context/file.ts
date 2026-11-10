import type { SourceFile } from "typescript/ast";

export interface FileContext {
	readonly sourceFile: SourceFile;
	readonly dependencies: Set<string>;
}

export function createFileContext(sourceFile: SourceFile) {
	const context: FileContext = {
		sourceFile,
		dependencies: new Set(),
	};

	return context;
}

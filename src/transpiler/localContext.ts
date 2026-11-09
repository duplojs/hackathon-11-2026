import type { SourceFile } from "typescript/ast";

export interface LocalTransformerContext {
	readonly sourceFile: SourceFile;
}

import * as GO from "@go";
import { type SourceFile } from "typescript/ast";

export function transformSourceFile(
	sourceFile: SourceFile,
): GO.AST.GoFile {
	return GO.AST.goFile({
		packageName: GO.AST.createIdentifier(sourceFile.fileName),
		imports: [],
		declarations: [],
	});
}

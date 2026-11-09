import * as GO from "@go";
import { type SourceFile } from "typescript/ast";
import type { TransformerContext } from "./context";
import type { LocalTransformerContext } from "./localContext";

export function transformSourceFile(
	sourceFile: SourceFile,
	context: TransformerContext,
): GO.AST.GoFile {
	const localContext: LocalTransformerContext = { sourceFile };

	return GO.AST.goFile({
		packageName: GO.AST.createIdentifier(localContext.sourceFile.fileName),
		imports: context.main.imports,
		declarations: context.main.topLevelDeclarations,
	});
}

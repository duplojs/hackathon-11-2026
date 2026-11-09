import * as GO from "@go";
import { type SourceFile } from "typescript/ast";
import type { TransformerContext } from "./context";
import type { LocalTransformerContext } from "./localContext";
import type { TransformationSuccess, TransformationError, NotfoundTransformer } from "./factory";

export function transformSourceFile(
	sourceFile: SourceFile,
	context: TransformerContext,
): Promise<
	| TransformationSuccess<GO.AST.GoFile>
	| TransformationError
	| NotfoundTransformer
> {
	const localContext: LocalTransformerContext = { sourceFile };

	return Promise.resolve(context.success({
		result: GO.AST.goFile({
			packageName: GO.AST.createIdentifier(localContext.sourceFile.fileName),
			imports: context.main.imports,
			declarations: context.main.topLevelDeclarations,
		}),
	}));
}

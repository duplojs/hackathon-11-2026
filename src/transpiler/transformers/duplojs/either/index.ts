import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";

export const duploJSEitherDeclarationTransformer: Transformer<GoAST.Declaration> = createTransformer(
	(data, context) => context.notSupport(),
);

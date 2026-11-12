import { createTransformer, type Transformer } from "../../../factory";
import type * as GO from "@go";

export const duploJSEitherDeclarationTransformer: Transformer<GO.AST.Declaration> = createTransformer(
	(data, context) => context.notSupport({}),
);

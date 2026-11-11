import * as DCommon from "@duplojs/lang/common";
import { createTransformer, type Transformer } from "../../../factory";
import type * as GO from "@go";

const duploJSEitherDeclarationTransformers = DCommon.memo(() => []);

export const duploJSEitherDeclarationTransformer: Transformer<GO.AST.Declaration> = createTransformer(
	(data) => {

	},
);

import * as DCommon from "@duplojs/lang/common";
import { duploJSEitherDeclarationTransformer } from "./either";
import type * as GO from "@go";
import { type Transformer } from "../../factory";

export const duploJSDeclarationTransformers = DCommon.memo(
	(): readonly Transformer<GO.AST.Declaration>[] => [duploJSEitherDeclarationTransformer],
);
export const duploJSExpressionTransformers = DCommon.memo(
	(): readonly Transformer<GO.AST.Expression>[] => [],
);
export const duploJSStatementTransformers = DCommon.memo(
	(): readonly Transformer<GO.AST.Statement>[] => [],
);
export const duploJSTypeTransformers = DCommon.memo(
	(): readonly Transformer<GO.AST.Type>[] => [],
);

import * as DCommon from "@duplojs/lang/common";
import { duploJSEitherDeclarationTransformer } from "./either";
import type { GoAST } from "@go";
import { type Transformer } from "@transformer";

export const duploJSDeclarationTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Declaration>[] => [duploJSEitherDeclarationTransformer],
);
export const duploJSExpressionTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Expression>[] => [],
);
export const duploJSStatementTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Statement>[] => [],
);
export const duploJSTypeTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Type>[] => [],
);

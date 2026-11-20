import * as DCommon from "@duplojs/lang/common";
import { duploJSEitherDeclarationTransformer, duploJSEitherExpressionTransformer, duploJSEitherTypeTransformer } from "./either";
import { duploJSCommonExpressionTransformer } from "./common";
import { duploJSArrayExpressionTransformer } from "./array";
import { duploJSStringExpressionTransformer } from "./string";
import type { GoAST } from "@go";
import { type Transformer } from "@transformer";

export const duploJSDeclarationTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Declaration>[] => [duploJSEitherDeclarationTransformer],
);
export const duploJSExpressionTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Expression>[] => [
		duploJSEitherExpressionTransformer,
		duploJSCommonExpressionTransformer,
		duploJSArrayExpressionTransformer,
		duploJSStringExpressionTransformer,
	],
);
export const duploJSStatementTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Statement>[] => [],
);
export const duploJSTypeTransformers = DCommon.memo(
	() => [duploJSEitherTypeTransformer],
);

import * as DCommon from "@duplojs/lang/common";
import { duploJSEitherDeclarationTransformer, duploJSEitherExpressionTransformer, duploJSEitherTypeTransformer, duploJSEitherUnionTypeTransformer } from "./either";
import { duploJSCommonExpressionTransformer } from "./common";
import { duploJSStringExpressionTransformer } from "./string";
import { duploJSArrayExpressionTransformer } from "./array";
import type { GoAST } from "@go";
import { type Transformer } from "@transformer";

export const duploJSDeclarationTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Declaration>[] => [duploJSEitherDeclarationTransformer],
);
export const duploJSExpressionTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Expression>[] => [
		duploJSEitherExpressionTransformer,
		duploJSCommonExpressionTransformer,
		duploJSStringExpressionTransformer,
		duploJSArrayExpressionTransformer,
	],
);
export const duploJSStatementTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Statement>[] => [],
);
export const duploJSTypeTransformers = DCommon.memo(
	() => [duploJSEitherTypeTransformer, duploJSEitherUnionTypeTransformer],
);

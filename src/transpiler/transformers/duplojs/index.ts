import * as DCommon from "@duplojs/lang/common";
import { duploJSEitherDeclarationTransformer } from "./either";

export const duploJSDeclarationTransformers = DCommon.memo(() => [duploJSEitherDeclarationTransformer]);
export const duploJSStatementTransformers = DCommon.memo(() => []);
export const duploJSExpressionTransformers = DCommon.memo(() => []);
export const duploJSTypeTransformers = DCommon.memo(() => []);

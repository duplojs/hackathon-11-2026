import * as DCommon from "@duplojs/lang/common";
import { callExpressionTransformer } from "./call";

export * from "./call";
export * from "./readableName";

export const sharedStatementTransformers = DCommon.memo(
	() => [callExpressionTransformer],
);

export const sharedExpressionTransformers = DCommon.memo(
	() => [callExpressionTransformer],
);

export const sharedDeclarationTransformers = DCommon.memo(
	() => [],
);

export const sharedTypeTransformers = DCommon.memo(
	() => [],
);

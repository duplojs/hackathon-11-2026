import * as DCommon from "@duplojs/lang/common";
import { binaryExpressionTransformer } from "./binaryExpression";
import { callExpressionTransformer } from "./callExpression";
import { numericLiteralTransformer } from "./numericLiteral";
import { parenthesizedExpressionTransformer } from "./parenthesizedExpression";

export {
	binaryExpressionTransformer,
	callExpressionTransformer,
	numericLiteralTransformer,
	parenthesizedExpressionTransformer,
};

export const expressionTransformers = DCommon.memo(() => [
	numericLiteralTransformer,
	binaryExpressionTransformer,
	callExpressionTransformer,
	parenthesizedExpressionTransformer,
]);

import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSExpressionTransformers } from "../duplojs";
import { identifierTransformer } from "../common";
import { numericLiteralTransformer } from "./numericLiteral";
import { sharedExpressionTransformers } from "../shared";
import { binaryExpressionTransformer } from "./binary";
import { prefixUnaryExpressionTransformer } from "./prefixUnary";
import { stringLiteralTransformer } from "./stringLiteral";
import { conditionalExpressionTransformer } from "./conditional";
import { arrowFunctionTransformer } from "./arrowFunction";
import { logicalExpressionTransformer } from "./logical";
import { typeAssertionExpressionTransformer } from "./typeAssertion";
import { nullLiteralTransformer } from "./nullLiteral";
import { arrayLiteralTransformer } from "./arrayLiteral";
import { parenthesizedExpressionTransformer } from "./parenthesized";
import { awaitExpressionTransformer } from "./await";

export const expressionTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Expression>[] => [
		...duploJSExpressionTransformers.value,
		...sharedExpressionTransformers.value,
		identifierTransformer,
		numericLiteralTransformer,
		stringLiteralTransformer,
		nullLiteralTransformer,
		arrayLiteralTransformer,
		parenthesizedExpressionTransformer,
		awaitExpressionTransformer,
		logicalExpressionTransformer,
		binaryExpressionTransformer,
		conditionalExpressionTransformer,
		arrowFunctionTransformer,
		prefixUnaryExpressionTransformer,
		typeAssertionExpressionTransformer,
	],
);

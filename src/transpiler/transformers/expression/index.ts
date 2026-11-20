import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSExpressionTransformers } from "../duplojs";
import { identifierTransformer } from "../common";
import { numericLiteralTransformer } from "./numericLiteral";
import { sharedExpressionTransformers } from "../shared";
import { binaryExpressionTransformer } from "./binary";
import { stringLiteralTransformer } from "./stringLiteral";
import { prefixUnaryExpressionTransformer } from "./prefixUnary";
import { arrowFunctionTransformer } from "./arrowFunction";
import { arrayLiteralTransformer } from "./arrayLiteral";
import { conditionalExpressionTransformer } from "./conditional";
import { nullLiteralTransformer } from "./null";
import { awaitExpressionTransformer } from "./await";

export const expressionTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Expression>[] => [
		...duploJSExpressionTransformers.value,
		...sharedExpressionTransformers.value,
		identifierTransformer,
		numericLiteralTransformer,
		stringLiteralTransformer,
		prefixUnaryExpressionTransformer,
		binaryExpressionTransformer,
		arrowFunctionTransformer,
		arrayLiteralTransformer,
		conditionalExpressionTransformer,
		nullLiteralTransformer,
		awaitExpressionTransformer,
	],
);

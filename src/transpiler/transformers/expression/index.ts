import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSExpressionTransformers } from "../duplojs";
import { identifierTransformer } from "../common";
import { numericLiteralTransformer } from "./numericLiteral";
import { stringLiteralTransformer } from "./stringLiteral";
import { booleanLiteralTransformer } from "./booleanLiteral";
import { arrayLiteralTransformer } from "./arrayLiteral";
import { prefixUnaryExpressionTransformer } from "./prefixUnary";
import { sharedExpressionTransformers } from "../shared";
import { binaryExpressionTransformer } from "./binary";
import { arrowFunctionTransformer } from "./arrowFunction";
import { globalIdentifierTransformer } from "./globals";
import { conditionalExpressionTransformer } from "./conditional";
import { templateExpressionTransformer } from "./template";
import { awaitExpressionTransformer } from "./await";
import {
	nullishCoalescingTransformer,
	nullLiteralTransformer,
	typeOfComparisonTransformer,
	typeOfExpressionTransformer,
	unionEqualityTransformer,
} from "./union";
import {
	elementAccessTransformer,
	inOperatorTransformer,
	objectLiteralTransformer,
	parenthesizedExpressionTransformer,
	propertyAccessTransformer,
	typeAssertionTransformer,
} from "./object";

export const expressionTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Expression>[] => [
		...duploJSExpressionTransformers.value,
		...sharedExpressionTransformers.value,
		awaitExpressionTransformer,
		globalIdentifierTransformer,
		identifierTransformer,
		numericLiteralTransformer,
		stringLiteralTransformer,
		booleanLiteralTransformer,
		arrayLiteralTransformer,
		objectLiteralTransformer,
		propertyAccessTransformer,
		elementAccessTransformer,
		typeAssertionTransformer,
		inOperatorTransformer,
		parenthesizedExpressionTransformer,
		prefixUnaryExpressionTransformer,
		nullLiteralTransformer,
		typeOfComparisonTransformer,
		typeOfExpressionTransformer,
		nullishCoalescingTransformer,
		unionEqualityTransformer,
		binaryExpressionTransformer,
		arrowFunctionTransformer,
		conditionalExpressionTransformer,
		templateExpressionTransformer,
	],
);

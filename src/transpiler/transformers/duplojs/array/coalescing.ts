import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from "../../expression";
import { goTypeOfExpression } from "../../type/goTypeOf";
import {
	callbackApplication,
	createInlineFunctionValue,
	type InlineFunction,
} from "../application";

/**
 * DArray.coalescing(x) inliné d'après le TYPE GO de x (ADR-2, ADR-7) : un slice
 * est renvoyé tel quel (même référence, comme `instanceof Array` en JS) ; toute
 * autre valeur est enveloppée dans `[]T{x}`. Le test d'exécution disparaît.
 */
export const coalescingInlineFunction: InlineFunction = (argument) => {
	if (DModeling.hasTagValue(argument.goType, "[node][type]slice")) {
		return callbackApplication({
			before: [],
			expression: argument.expression,
			goType: argument.goType,
		});
	}

	const sliceType = GoAST.createSliceType({ elementType: argument.goType });

	return callbackApplication({
		before: [],
		expression: GoAST.createSliceLiteral({
			typeReference: sliceType,
			elements: [argument.expression],
		}),
		goType: sliceType,
	});
};

export const coalescingExpressionHandler: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		// En valeur (ni appelé, ni consommé par un handler) : eta-expansion (ADR-7).
		if (!TsAST.isCallExpression(node)) {
			return createInlineFunctionValue(node, coalescingInlineFunction, context);
		}

		const [argument] = node.arguments;

		if (!argument || !DArray.lengthEqual(node.arguments, 1) || TsAST.isSpreadElement(argument)) {
			return context.error(node, "DArray.coalescing requires exactly one non-spread argument");
		}

		const expression = DEither.unwrapRight(await context.transform(argument, expressionTransformers.value));

		if (DEither.isLeft(expression)) {
			return expression;
		}

		const goType = DEither.unwrapRight(await goTypeOfExpression(argument, context));

		if (DEither.isLeft(goType)) {
			return goType;
		}

		const application = DEither.unwrapRight(
			await coalescingInlineFunction(
				{
					expression: expression.result,
					goType: goType.result,
				},
				node,
				context,
			),
		);

		if (DEither.isLeft(application)) {
			return application;
		}

		return context.success({
			before: [...expression.before, ...application.before],
			result: application.expression,
		});
	},
);

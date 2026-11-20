import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { expressionTransformers } from ".";
import { transformTypeOfExpression } from "../type/ofExpression";

/**
 * `[a, b, c]` → `[]T{a, b, c}`.
 *
 * Le type des éléments vient du checker (`[-12]` → `number[]` → `[]float64`).
 * Chaque élément passe d'abord par une variable temporaire (ordre d'évaluation).
 * Limite : `[...autre]` (spread) et les trous `[1, , 3]` ne sont pas gérés.
 */
export const arrayLiteralExpressionTransformer: Transformer<GoAST.SliceLiteral> = createTransformer(
	async(node, context) => {
		if (!TsAST.isArrayLiteralExpression(node)) {
			return context.notSupport();
		}

		const sliceType = await transformTypeOfExpression(node, context);

		if (DEither.isLeft(sliceType)) {
			return sliceType;
		}

		if (!DModeling.hasTagValue(sliceType.result, "[node][type]slice")) {
			return context.error(node, "array-literal-type-is-not-a-slice");
		}

		const before: GoAST.Statement[] = [...sliceType.before];
		const elements: GoAST.Identifier[] = [];

		for (const elementNode of node.elements) {
			if (TsAST.isSpreadElement(elementNode) || TsAST.isOmittedExpression(elementNode)) {
				return context.error(elementNode, "array-literal-element-not-supported");
			}

			const element = await DCommon.asyncPipe(
				context.transform(elementNode, expressionTransformers.value),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(element)) {
				return element;
			}

			const statement = GoAST.createShortVariableDeclarationStatement({
				identifier: context.generateIdentifier(),
				initializer: element.result,
			});

			before.push(...element.before, statement);
			elements.push(statement.identifier);
		}

		return context.success({
			before,
			result: GoAST.createSliceLiteral({
				typeReference: sliceType.result,
				elements,
			}),
		});
	},
);

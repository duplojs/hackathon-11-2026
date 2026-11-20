import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { goTypeOfExpression } from "../type/goTypeOf";
import { toInlineFunction } from "../duplojs/string/to";
import { expressionTransformers } from ".";

// Morceau littéral du gabarit ; un morceau vide est omis (pas de `+ ""`).
function literalPart(text: string): readonly GoAST.Expression[] {
	return text === "" ? [] : [GoAST.createStringLiteral({ value: text })];
}

/**
 * Gabarit `` `a ${x} b` `` : concaténation de chaînes. Chaque `${x}` applique
 * String(x) en JS, c'est-à-dire exactement DString.to : même traduction inlinée
 * (JSNumberToString pour un nombre…). Les expressions sont évaluées dans l'ordre,
 * chacune liée à une variable.
 */
export const templateExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (TsAST.isNoSubstitutionTemplateLiteral(node)) {
			return context.success({ result: GoAST.createStringLiteral({ value: node.text }) });
		}

		if (!TsAST.isTemplateExpression(node)) {
			return context.notSupport();
		}

		const parts = await DCommon.asyncPipe(
			node.templateSpans,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<{
					before: readonly GoAST.Statement[];
					parts: readonly GoAST.Expression[];
				}>({
					before: [],
					parts: literalPart(node.head.text),
				}),
				async({ item, lastValue, next, exit }) => {
					const expression = DEither.unwrapRight(
						await context.transform(item.expression, expressionTransformers.value),
					);

					if (DEither.isLeft(expression)) {
						return exit(expression);
					}

					const goType = DEither.unwrapRight(await goTypeOfExpression(item.expression, context));

					if (DEither.isLeft(goType)) {
						return exit(goType);
					}

					const text = DEither.unwrapRight(
						await toInlineFunction(
							{
								expression: expression.result,
								goType: goType.result,
							},
							item.expression,
							context,
						),
					);

					if (DEither.isLeft(text)) {
						return exit(text);
					}

					const binding = GoAST.createShortVariableDeclarationStatement({
						identifier: context.generateIdentifier(),
						initializer: text.expression,
					});

					return next({
						before: DArray.concat(lastValue.before, expression.before, text.before, [binding]),
						parts: DArray.concat(
							lastValue.parts,
							[binding.identifier],
							literalPart(item.literal.text),
						),
					});
				},
			),
		);

		if (DEither.isLeft(parts)) {
			return parts;
		}

		const [first, ...others] = parts.parts;

		return context.success({
			before: parts.before,
			result: DArray.reduce(
				others,
				DArray.reduceFrom<GoAST.Expression>(first ?? GoAST.createStringLiteral({ value: "" })),
				({ element, lastValue, next }) => next(
					GoAST.createBinaryExpression({
						operator: "+",
						left: lastValue,
						right: element,
					}),
				),
			),
		});
	},
);

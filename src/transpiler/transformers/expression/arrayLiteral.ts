import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from ".";
import { goTypeOf, goTypeOfExpression, type GoType } from "../type/goTypeOf";
import { type BuildContext } from "../../context/build";
import { coerceGoExpression } from "../duplojs/either/coerce";
import { isExpectedTypeEitherConstructor } from "../duplojs/either/constructor";

/**
 * ADR-13 : élément converti vers le type des éléments du slice (`[1, "a"]` dans
 * un `(string | number)[]`). Sans conversion possible : inchangé.
 */
async function coerceElement(
	item: TsAST.Expression,
	expression: GoAST.Expression,
	elementGoType: GoType,
	context: BuildContext,
) {
	const itemGoType = DEither.unwrapRight(await goTypeOfExpression(item, context));

	if (DEither.isLeft(itemGoType) || await isExpectedTypeEitherConstructor(item, context)) {
		return expression;
	}

	const coerced = await coerceGoExpression({
		expression,
		fromGoType: itemGoType.result,
		toGoType: elementGoType,
		from: await context.transpilation.typeChecker.getTypeAtLocation(item),
	}, context);

	return DEither.isLeft(coerced) ? expression : DEither.unwrapRight(coerced).result;
}

export const arrayLiteralTransformer: Transformer<GoAST.SliceLiteral> = createTransformer(
	async(node, context) => {
		if (!TsAST.isArrayLiteralExpression(node)) {
			return context.notSupport();
		}

		for (const element of node.elements) {
			if (TsAST.isSpreadElement(element) || TsAST.isOmittedExpression(element)) {
				return context.error(element, "Spread elements and omitted array elements are not supported");
			}
		}

		// Type ATTENDU d'abord (`const empty: number[] = []` : le littéral seul est
		// `never[]`), sinon le type propre du littéral.
		const { typeChecker } = context.transpilation;
		const contextualType = await typeChecker.getContextualType(node);
		const contextualGoType = contextualType && DEither.unwrapRight(await goTypeOf(contextualType, node, context));
		const type = contextualGoType && !DEither.isLeft(contextualGoType)
			&& DModeling.hasTagValue(contextualGoType.result, "[node][type]slice")
			? contextualGoType
			: await DCommon.asyncPipe(
				goTypeOf(await typeChecker.getTypeAtLocation(node), node, context),
				DEither.unwrapRight,
			);

		if (DEither.isLeft(type)) {
			return type;
		}

		if (!DModeling.hasTagValue(type.result, "[node][type]slice")) {
			return context.error(node, {
				expected: "slice type",
			});
		}

		const sliceElementType = type.result.elementType;
		const elements = await DCommon.asyncPipe(
			node.elements,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<{
					before: readonly GoAST.Statement[];
					elements: readonly GoAST.Expression[];
				}>({
					before: [],
					elements: [],
				}),
				async({ item, lastValue, next, exit }) => {
					const element = await DCommon.asyncPipe(
						context.transform(item, expressionTransformers.value),
						DEither.unwrapRight,
					);

					if (DEither.isLeft(element)) {
						return exit(element);
					}

					const assignment = GoAST.createShortVariableDeclarationStatement({
						identifier: context.generateIdentifier(),
						initializer: element.result,
					});

					return next({
						before: DArray.concat(
							lastValue.before,
							element.before,
							[assignment],
						),
						elements: DArray.push(
							lastValue.elements,
							await coerceElement(item, assignment.identifier, sliceElementType, context),
						),
					});
				},
			),
		);

		if (DEither.isLeft(elements)) {
			return elements;
		}

		return context.success({
			before: elements.before,
			result: GoAST.createSliceLiteral({
				typeReference: type.result,
				elements: elements.elements,
			}),
		});
	},
);

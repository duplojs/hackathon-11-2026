import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { IndexKind } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { convertToCheckerType, transformCheckerType } from "../type";
import { expressionTransformers } from ".";

interface TranslatedElements {
	readonly before: readonly GoAST.Statement[];
	readonly elements: readonly GoAST.Expression[];
}

// Le type du littéral est celui calculé par le checker (annotation ou contexte) : un tuple
// devient un tableau Go `[N]T`, un tableau une slice `[]T`. Les éléments sont évalués dans
// l'ordre ; quand l'un d'eux demande des préparations, chaque élément passe par une variable
// pour que ces préparations ne s'exécutent pas avant les éléments qui le précèdent.
export const arrayLiteralTransformer: Transformer<GoAST.ArrayLiteral | GoAST.SliceLiteral> = createTransformer(
	async(node, context) => {
		if (!TsAST.isArrayLiteralExpression(node)) {
			return context.notSupport();
		}

		const { typeChecker } = context.transpilation;
		// Un littéral vide a pour type `never[]` : le type attendu par le contexte (annotation,
		// paramètre) donne alors le type de ses éléments.
		const contextualType = DArray.lengthEqual(node.elements, 0)
			? await typeChecker.getContextualType(node)
			: undefined;
		const literalType = contextualType ?? await typeChecker.getTypeAtLocation(node);

		const goType = await transformCheckerType(literalType, node, context);

		if (DEither.isLeft(goType)) {
			return goType;
		}

		const elementType = await typeChecker.getIndexTypeOfType(literalType, IndexKind.Number);

		if (!elementType) {
			return context.error(node, "array-literal-element-type-not-resolved");
		}

		const translated = await DCommon.asyncPipe(
			node.elements,
			DArray.map(
				async(elementNode) => {
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

					const value = await convertToCheckerType({
						expression: element.result,
						source: await typeChecker.getTypeAtLocation(elementNode),
						target: elementType,
						location: elementNode,
						context,
					});

					if (DEither.isLeft(value)) {
						return value;
					}

					return DEither.success({
						before: element.before,
						value: DEither.unwrapRight(value),
					});
				},
			),
			DCommon.promiseAll,
		);

		const needsVariables = DArray.some(
			translated,
			(element) => DEither.isRight(element) && !DArray.lengthEqual(DEither.unwrapRight(element).before, 0),
		);

		const elements = DCommon.pipe(
			translated,
			DArray.reduce(
				DArray.reduceFrom<TranslatedElements>({
					before: [],
					elements: [],
				}),
				({ element, lastValue, next, exit }) => {
					if (DEither.isLeft(element)) {
						return exit(element);
					}

					const { before, value } = DEither.unwrapRight(element);

					if (!needsVariables) {
						return next({
							before: lastValue.before,
							elements: DArray.push(lastValue.elements, value),
						});
					}

					const variable = GoAST.createShortVariableDeclarationStatement({
						identifier: context.generateIdentifier("element"),
						initializer: value,
					});

					return next({
						before: DArray.concat(lastValue.before, before, [variable]),
						elements: DArray.push(lastValue.elements, variable.identifier),
					});
				},
			),
		);

		if (DEither.isLeft(elements)) {
			return elements;
		}

		const typeReference = DEither.unwrapRight(goType);

		if (DModeling.hasTagValue(typeReference, "[node][type]array")) {
			return context.success({
				before: elements.before,
				result: GoAST.createArrayLiteral({
					typeReference,
					elements: elements.elements,
				}),
			});
		}

		if (DModeling.hasTagValue(typeReference, "[node][type]slice")) {
			return context.success({
				before: elements.before,
				result: GoAST.createSliceLiteral({
					typeReference,
					elements: elements.elements,
				}),
			});
		}

		return context.error(node, "array-literal-type-not-supported");
	},
);

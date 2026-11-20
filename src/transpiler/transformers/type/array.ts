import { GoAST, GoPrinter } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { typeTransformers } from ".";

/**
 * Tableaux et tuples TS → slice Go.
 *
 *   number[]              → []float64
 *   readonly [number]     → []float64   (tuple dont tous les éléments ont le même type)
 *   readonly string[]     → []string    (`readonly` n'existe pas en Go : on le retire)
 *
 * Limite : un tuple aux éléments de types différents ([number, string]) est refusé.
 * La longueur fixe d'un tuple n'est pas conservée (un slice a une taille libre).
 */
export const arrayTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async(node, context) => {
		// `readonly X` : on traduit X
		if (TsAST.isTypeOperatorNode(node) && node.operator === TsAST.SyntaxKind.ReadonlyKeyword) {
			return context.transform(node.type, typeTransformers.value);
		}

		if (TsAST.isArrayTypeNode(node)) {
			const element = await DCommon.asyncPipe(
				context.transform(node.elementType, typeTransformers.value),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(element)) {
				return element;
			}

			return context.success({
				before: element.before,
				result: GoAST.createSliceType({ elementType: element.result }),
			});
		}

		if (TsAST.isTupleTypeNode(node)) {
			const elements = [];

			for (const elementNode of node.elements) {
				const element = await DCommon.asyncPipe(
					context.transform(
						TsAST.isNamedTupleMember(elementNode) ? elementNode.type : elementNode,
						typeTransformers.value,
					),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(element)) {
					return element;
				}

				elements.push(element.result);
			}

			const [first] = elements;
			const rendered = DArray.map(elements, (element) => GoPrinter.renderNode(element));

			if (!first || DArray.some(rendered, (goType) => goType !== DArray.first(rendered))) {
				return context.error(node, "tuple-with-different-element-types");
			}

			return context.success({
				result: GoAST.createSliceType({ elementType: first }),
			});
		}

		return context.notSupport();
	},
);

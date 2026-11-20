import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoAST, GoPrinter } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import { createUnionGoType } from "./taggedUnion";

// Tuple HOMOGÈNE (`[T]`, `[T, T]`) : []T (décision ADR-2 pour le Sprint 2 ;
// la forme [N]T est reportée à l'exercice 08). Un tuple hétérogène, vide,
// à éléments nommés, optionnels ou variadiques n'est pas pris en charge ici.
export const homogeneousTupleTypeTransformer: Transformer<GoAST.SliceType> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTupleTypeNode(node) || DArray.lengthEqual(node.elements, 0)) {
			return context.notSupport();
		}

		const elementTypes = await DCommon.asyncPipe(
			node.elements,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<readonly (GoAST.Type | GoAST.TypeReference)[]>([]),
				async({ item, lastValue, next, exit }) => {
					// D22 : `never` est l'élément neutre de l'union des éléments (T | never = T).
					// `Success<[1, never, 3]>` (asyncGroup dont la 2e fabrique échoue toujours)
					// décrit un succès impossible ; les autres positions donnent le type Go.
					if (item.kind === TsAST.SyntaxKind.NeverKeyword) {
						return next(lastValue);
					}

					if (
						TsAST.isNamedTupleMember(item)
						|| TsAST.isOptionalTypeNode(item)
						|| TsAST.isRestTypeNode(item)
					) {
						return exit(context.notSupport());
					}

					const elementType = await DCommon.asyncPipe(
						context.transform(item, typeTransformers.value),
						DEither.unwrapRight,
					);

					if (DEither.isLeft(elementType)) {
						return exit(elementType);
					}

					if (!DArray.lengthEqual(elementType.before, 0)) {
						return exit(context.error(item, "un-support-before-on-tuple-element-type"));
					}

					return next(DArray.push(lastValue, elementType.result));
				},
			),
		);

		if (DEither.isLeft(elementTypes)) {
			return elementTypes;
		}

		const firstType = DArray.first(elementTypes);
		const isHomogeneous = firstType !== undefined && DArray.every(
			elementTypes,
			(elementType) => GoPrinter.renderNode(elementType) === GoPrinter.renderNode(firstType),
		);

		if (!firstType) {
			return context.notSupport();
		}

		// ADR-14 : tuple HÉTÉROGÈNE (`[string, number]`) : slice d'une union
		// étiquetée des types d'éléments. Il reste un tableau en JS (affichage,
		// indexation, destructuration) ; la lecture d'une position est rétrécie
		// vers le type que TypeScript connaît à cette position.
		const elementType = isHomogeneous
			? firstType
			: createUnionGoType(elementTypes, context);

		if (!elementType) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.createSliceType({
				elementType: elementType as Parameters<typeof GoAST.createSliceType>[0]["elementType"],
			}),
		});
	},
);

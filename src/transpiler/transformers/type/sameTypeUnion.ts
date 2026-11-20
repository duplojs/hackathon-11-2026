import { GoPrinter } from "@go";
import { type GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { typeTransformers } from ".";

/**
 * Une union dont tous les membres donnent LE MÊME type Go devient ce type.
 *
 *   readonly [number] | number[]   → []float64 et []float64 → []float64
 *
 * Cas du résultat de `whenIsRightOtherwise(coalescing, () => [-12])` (exercice 05) :
 * TS distingue un tuple et un tableau, Go n'a que des slices.
 * Si les membres donnent des types Go différents : pas pour ce transformer.
 */
export const sameTypeUnionTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isUnionTypeNode(node)) {
			return context.notSupport();
		}

		const members = [];

		for (const member of node.types) {
			const translated = await DCommon.asyncPipe(
				context.transform(member, typeTransformers.value),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(translated)) {
				return context.notSupport();
			}

			members.push(translated.result);
		}

		const rendered = DArray.map(members, (member) => GoPrinter.renderNode(member));
		const [first] = members;

		if (!first || DArray.some(rendered, (goType) => goType !== DArray.first(rendered))) {
			return context.notSupport();
		}

		return context.success({ result: first });
	},
);

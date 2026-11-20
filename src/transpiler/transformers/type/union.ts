import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoPrinter } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import { type GoType } from "./goTypeOf";
import { eitherDependency } from "../duplojs/either/sharedDependency";
import {
	createEitherGoType,
	createEither2GoType,
	createEitherNoValueGoType,
	getEither2GoTypes,
	getEitherValueGoType,
	isEitherNoValueGoType,
} from "../duplojs/either/goType";
import { createUnionGoType } from "./taggedUnion";

// T2 : chaque membre est rendu UNE fois (Set des rendus), au lieu d'une
// comparaison deux à deux qui rendait les types à chaque paire.
function distinctByRender(goTypes: readonly GoType[]) {
	const seen = new Set<string>();

	return DArray.filter(goTypes, (goType) => {
		const render = GoPrinter.renderNode(goType);

		if (seen.has(render)) {
			return false;
		}

		seen.add(render);

		return true;
	});
}

/**
 * Règle de regroupement des unions (ADR-2) : chaque membre est traduit en type
 * Go, puis comparé PAR RENDU GO.
 * - que des membres nus de même type T : T (ex. `"a" | "b"` : string) ;
 * - des variantes Either (de valeur V, ou sans valeur comme Fail) et des membres
 *   nus de type V : Either[V] (ex. `Fail | readonly [number]` : Either[[]float64]),
 *   les membres nus étant portés par la forme Plain ;
 * - plusieurs types Go (membres nus, gauches ou droites) : union étiquetée
 *   UnionN (ADR-13), et Either2[gauches, droites] quand les deux côtés diffèrent.
 */
export const unionTypeTransformer: Transformer<GoType> = createTransformer(
	async(node, context) => {
		if (!TsAST.isUnionTypeNode(node)) {
			return context.notSupport();
		}

		const memberTypes = await DCommon.asyncPipe(
			node.types,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<readonly {
					goType: GoType;
					variantName: string | undefined;
				}[]>([]),
				async({ item, lastValue, next, exit }) => {
					const memberType = await DCommon.asyncPipe(
						context.transform(item, typeTransformers.value),
						DEither.unwrapRight,
					);

					if (DEither.isLeft(memberType)) {
						return exit(memberType);
					}

					if (!DArray.lengthEqual(memberType.before, 0)) {
						return exit(context.error(item, "un-support-before-on-union-member-type"));
					}

					const moduleReference = TsAST.isTypeReferenceNode(item) || TsAST.isImportTypeNode(item)
						? DEither.unwrapRight(
							await context.resolveReferenceModule(
								TsAST.isTypeReferenceNode(item) ? item.typeName : item,
								"@duplojs/lang",
								/^dist\/either\//,
							),
						)
						: undefined;

					const variantName = moduleReference && !DEither.isLeft(moduleReference)
						? moduleReference.symbol.name
						: undefined;

					return next(DArray.push(lastValue, {
						goType: memberType.result,
						variantName,
					}));
				},
			),
		);

		if (DEither.isLeft(memberTypes)) {
			return memberTypes;
		}

		const eitherValueTypes = DArray.reduce(
			memberTypes,
			DArray.reduceFrom<readonly GoType[]>([]),
			({ element, lastValue, next }) => {
				const valueType = DEither.unwrapRight(getEitherValueGoType(element.goType));

				return next(
					DEither.isLeft(valueType)
						? lastValue
						: DArray.push(lastValue, valueType),
				);
			},
		);

		const plainTypes = DArray.filter(
			memberTypes,
			(memberType) => DEither.isLeft(getEitherValueGoType(memberType.goType)),
		);

		// Union sans Either : un seul type Go (ADR-2), sinon union étiquetée (ADR-13).
		if (DArray.lengthEqual(eitherValueTypes, 0)) {
			const plainType = createUnionGoType(DArray.map(plainTypes, ({ goType }) => goType), context);

			if (!plainType) {
				return context.notSupport();
			}

			return context.success({ result: plainType });
		}

		const packageName = context.registerSharedDependency(eitherDependency.value);
		const leftTypes: GoType[] = [];
		const rightTypes: GoType[] = [];
		const unclassifiedEitherTypes: GoType[] = [];

		for (const member of memberTypes) {
			const either2Types = DEither.unwrapRight(getEither2GoTypes(member.goType));

			if (!DEither.isLeft(either2Types)) {
				if (member.variantName === "Left" || member.variantName === "Fail") {
					if (!isEitherNoValueGoType(either2Types.leftType)) {
						leftTypes.push(either2Types.leftType);
					}
				} else if (member.variantName === "Right" || member.variantName === "Success") {
					rightTypes.push(either2Types.rightType);
				} else {
					unclassifiedEitherTypes.push(member.goType);
				}

				continue;
			}

			const eitherValue = DEither.unwrapRight(getEitherValueGoType(member.goType));

			if (DEither.isLeft(eitherValue)) {
				rightTypes.push(member.goType);
				continue;
			}

			if (member.variantName === "Left" || member.variantName === "Fail") {
				if (!isEitherNoValueGoType(eitherValue)) {
					leftTypes.push(eitherValue);
				}
			} else if (member.variantName === "Right" || member.variantName === "Success") {
				rightTypes.push(eitherValue);
			} else {
				unclassifiedEitherTypes.push(eitherValue);
			}
		}

		const distinctLeftTypes = distinctByRender(leftTypes);
		const distinctRightTypes = distinctByRender(rightTypes);
		const distinctUnclassifiedTypes = distinctByRender(unclassifiedEitherTypes);
		const distinctPlainTypes = distinctByRender(DArray.map(plainTypes, ({ goType }) => goType));

		if (distinctUnclassifiedTypes.length > 0) {
			if (
				distinctUnclassifiedTypes.length > 1
				|| distinctLeftTypes.length > 0
				|| distinctRightTypes.length > 0
				|| distinctPlainTypes.length > 1
			) {
				return context.notSupport();
			}

			const fallback = DArray.first(distinctUnclassifiedTypes);

			return context.success({
				result: createEitherGoType(
					packageName,
					fallback ?? DArray.first(distinctPlainTypes) ?? createEitherNoValueGoType(packageName),
				),
			});
		}

		const plainJoinsRight = distinctPlainTypes.length === 0
			|| (distinctRightTypes.length === 0 && distinctPlainTypes.length === 1)
			|| (
				distinctRightTypes.length === 1
				&& distinctPlainTypes.length === 1
				&& GoPrinter.renderNode(distinctRightTypes[0]!) === GoPrinter.renderNode(distinctPlainTypes[0]!)
			);

		// ADR-13 : plusieurs types de gauche, de droite, ou valeurs nues d'un autre
		// type que la droite : chaque côté devient une union étiquetée.
		if (distinctLeftTypes.length > 1 || distinctRightTypes.length > 1 || !plainJoinsRight) {
			const unionLeftType = createUnionGoType(distinctLeftTypes, context);
			const unionRightType = createUnionGoType([...distinctRightTypes, ...distinctPlainTypes], context);

			if (!unionLeftType || !unionRightType) {
				return context.success({
					result: createEitherGoType(
						packageName,
						unionLeftType ?? unionRightType ?? createEitherNoValueGoType(packageName),
					),
				});
			}

			return context.success({
				result: GoPrinter.renderNode(unionLeftType) === GoPrinter.renderNode(unionRightType)
					? createEitherGoType(packageName, unionLeftType)
					: createEither2GoType(packageName, unionLeftType, unionRightType),
			});
		}

		const leftType = DArray.first(distinctLeftTypes);
		const rightType = DArray.first(distinctRightTypes)
			?? DArray.first(distinctPlainTypes);

		if (!leftType || !rightType) {
			const onlySideType = leftType ?? rightType;

			return context.success({
				result: createEitherGoType(
					packageName,
					onlySideType ?? createEitherNoValueGoType(packageName),
				),
			});
		}

		if (GoPrinter.renderNode(leftType) === GoPrinter.renderNode(rightType)) {
			return context.success({ result: createEitherGoType(packageName, leftType) });
		}

		return context.success({
			result: createEither2GoType(packageName, leftType, rightType),
		});
	},
);

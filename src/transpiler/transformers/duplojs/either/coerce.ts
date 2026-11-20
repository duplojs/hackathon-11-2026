import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoAST, GoPrinter } from "@go";
import {
	type NotfoundTransformer,
	type TransformationError,
	type TransformationNotSupported,
	type TransformationSuccess,
} from "@transformer";
import { type TsAST } from "@typescript";
import { type Type } from "typescript/async";
import { type BuildContext } from "../../../context/build";
import { goTypeOf, type GoType } from "../../type/goTypeOf";
import {
	getEither2GoTypes,
	getEitherValueGoType,
	isEitherNoValueGoType,
} from "./goType";
import {
	createUnionValue,
	findUnionMemberIndex,
	convertUnion,
	getUnionMemberGoTypes,
	narrowUnionExpression,
	renderGoType,
} from "../../type/taggedUnion";
import { goBuilder as go } from "../../type/goBuilder";
import { createAbsentFieldValue, getStructFields, type StructField } from "../../type/object";
import {
	eitherConversionDependency,
	either2FromEitherFunctionIdentifier,
	either2MapFunctionIdentifier,
	either2PlainOfFunctionIdentifier,
	eitherMapFunctionIdentifier,
} from "./conversionDependency";
import {
	either2FromLeftFunctionIdentifier,
	eitherDependency,
	eitherPlainFunctionIdentifier,
	eitherRetypeFunctionIdentifier,
} from "./sharedDependency";

// expression : expression Go déjà évaluée (identifiant ou temporaire de préférence) ;
// from : type TS de la valeur ; to : type TS attendu à l'emplacement (retour,
// variable, branche…) ; site : nœud TS du site, pour typeToTypeNode et les erreurs.
export interface CoerceExpressionParams {
	readonly expression: GoAST.Expression;
	readonly from: Type;
	readonly to: Type;
	readonly site: TsAST.Node;
}

/**
 * Nom DuploJS (Success, Fail, Left, Right…) de chaque membre de `type`, reconnu par
 * symbole résolu dans @duplojs/lang (dist/either/) ; `undefined` pour un membre
 * qui n'est pas un Either (valeur nue).
 */
export async function eitherVariantNames(
	type: Type,
	context: BuildContext,
): Promise<readonly (string | undefined)[]> {
	const members = type.isUnionType() ? await type.getTypes() : [type];

	return DCommon.asyncPipe(
		members,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<readonly (string | undefined)[]>([]),
			async({ item, lastValue, next }) => {
				const symbol = await item.getAliasSymbol() ?? await item.getSymbol();
				const moduleReference = symbol && DEither.unwrapRight(
					await context.resolveReferenceModule(symbol, "@duplojs/lang", /^dist\/either\//),
				);

				return next(
					DArray.push(
						lastValue,
						moduleReference && !DEither.isLeft(moduleReference)
							? moduleReference.symbol.name
							: undefined,
					),
				);
			},
		),
	);
}

// Une variante gauche porte-t-elle une valeur ? Seul Fail (Left<"fail", void>)
// n'en porte pas. Reconnaissance par symbole résolu, membre par membre.
export async function hasOnlyValuelessLeftVariants(type: Type, context: BuildContext) {
	const names = await eitherVariantNames(type, context);

	return DArray.every(names, (name) => name !== "Left");
}

export interface CoerceGoExpressionParams {
	readonly expression: GoAST.Expression;
	readonly fromGoType: GoType;
	readonly toGoType: GoType;
	// Type TS de la valeur, s'il est connu : seul moyen de savoir si ses variantes
	// gauches sont sans valeur (condition d'EitherRetype). Absent : pas de retypage.
	readonly from?: Type;
}

/**
 * Coercition d'après les TYPES GO (Sprint 3, ADR-7) : utilisée quand le type TS
 * n'est pas instanciable (résultat d'une fonction générique passée en valeur).
 * Mêmes règles que coerceExpression : identité, valeur nue vers Either[T]
 * (EitherPlainOf), Either[A] vers Either[B] si `from` n'a que des gauches sans
 * valeur (EitherRetype) ; sinon notSupport.
 */
async function coerceGoExpressionLegacy(
	params: CoerceGoExpressionParams,
	context: BuildContext,
): Promise<
	| TransformationSuccess<GoAST.Expression>
	| TransformationNotSupported
> {
	const { expression, fromGoType, toGoType, from } = params;

	if (GoPrinter.renderNode(fromGoType) === GoPrinter.renderNode(toGoType)) {
		return context.success({ result: expression });
	}

	const toEither2Types = DEither.unwrapRight(getEither2GoTypes(toGoType));

	if (!DEither.isLeft(toEither2Types)) {
		const fromEitherTypes = DEither.unwrapRight(getEitherValueGoType(fromGoType));

		if (
			!DEither.isLeft(fromEitherTypes)
			&& GoPrinter.renderNode(fromEitherTypes) === GoPrinter.renderNode(toEither2Types.leftType)
		) {
			const packageName = context.registerSharedDependency(eitherDependency.value);

			return context.success({
				result: GoAST.createCallExpression({
					callee: GoAST.createInstantiationExpression({
						target: GoAST.createSelectorExpression({
							target: packageName,
							identifier: either2FromLeftFunctionIdentifier,
						}),
						typeArguments: DCommon.cast([
							toEither2Types.leftType,
							toEither2Types.rightType,
						]),
					}),
					arguments: [expression],
				}),
			});
		}

		return context.notSupport();
	}

	const toValueType = DEither.unwrapRight(getEitherValueGoType(toGoType));

	if (DEither.isLeft(toValueType)) {
		return context.notSupport();
	}

	const fromValueType = DEither.unwrapRight(getEitherValueGoType(fromGoType));

	if (DEither.isLeft(fromValueType)) {
		if (GoPrinter.renderNode(fromGoType) !== GoPrinter.renderNode(toValueType)) {
			return context.notSupport();
		}

		const packageName = context.registerSharedDependency(eitherDependency.value);

		return context.success({
			result: GoAST.createCallExpression({
				callee: GoAST.createInstantiationExpression({
					target: GoAST.createSelectorExpression({
						target: packageName,
						identifier: eitherPlainFunctionIdentifier,
					}),
					typeArguments: DCommon.cast([toValueType]),
				}),
				arguments: [expression],
			}),
		});
	}

	const valueless = isEitherNoValueGoType(fromValueType)
		|| (from !== undefined && await hasOnlyValuelessLeftVariants(from, context));

	if (!valueless) {
		return context.notSupport();
	}

	const packageName = context.registerSharedDependency(eitherDependency.value);

	return context.success({
		result: GoAST.createCallExpression({
			callee: GoAST.createInstantiationExpression({
				target: GoAST.createSelectorExpression({
					target: packageName,
					identifier: eitherRetypeFunctionIdentifier,
				}),
				typeArguments: DCommon.cast([toValueType, fromValueType]),
			}),
			arguments: [expression],
		}),
	});
}

/**
 * Contrat Sprint 2 (P4) : coercition explicite d'une valeur de type TS `from`
 * vers le type TS `to` (TS l'autorise implicitement, Go non).
 * Traduit les deux types en Go puis applique coerceGoExpression.
 * Instanciation générique toujours explicite (D1). Aucun `before` produit.
 */
export async function coerceExpression(
	params: CoerceExpressionParams,
	context: BuildContext,
): Promise<
	| TransformationSuccess<GoAST.Expression>
	| TransformationError
	| NotfoundTransformer
	| TransformationNotSupported
> {
	const fromGoType = await DCommon.asyncPipe(
		goTypeOf(params.from, params.site, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(fromGoType)) {
		return fromGoType;
	}

	const toGoType = await DCommon.asyncPipe(
		goTypeOf(params.to, params.site, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(toGoType)) {
		return toGoType;
	}

	return coerceGoExpression(
		{
			expression: params.expression,
			fromGoType: fromGoType.result,
			toGoType: toGoType.result,
			from: params.from,
		},
		context,
	);
}

type CoerceResult = TransformationSuccess<GoAST.Expression> | TransformationNotSupported;

/**
 * Coercition d'après les TYPES GO. Les règles historiques (ADR-2, ADR-7) passent
 * d'abord, et leur Go est inchangé ; les règles de l'ADR-13 ne servent que là où
 * elles renvoyaient notSupport :
 * - union étiquetée : membre vers union (`UnionN{Tag, Vi}`), union vers membre
 *   rétréci par TypeScript (`x.Vi`), union vers union (conversion par étiquette) ;
 * - Either[V] vers Either[W], Either[V] ou Either2 vers Either2[L, R], valeur nue
 *   vers Either2 : chaque côté est converti récursivement. Un côté que le type TS
 *   source rend impossible (pas de Success, ou seulement des gauches sans valeur)
 *   reçoit une conversion vers la valeur zéro, jamais appelée sur une vraie valeur.
 */
export async function coerceGoExpression(
	params: CoerceGoExpressionParams,
	context: BuildContext,
): Promise<CoerceResult> {
	const legacy = await coerceGoExpressionLegacy(params, context);

	if (!DEither.isLeft(legacy)) {
		return legacy;
	}

	return coerceGoExpressionExtended(params, context);
}

async function coerceToUnion(
	params: CoerceGoExpressionParams,
	targetMembers: readonly GoType[],
	context: BuildContext,
): Promise<CoerceResult> {
	const { expression, fromGoType, toGoType } = params;
	const index = findUnionMemberIndex(targetMembers, fromGoType);

	if (index >= 0) {
		return context.success({ result: createUnionValue(toGoType, index, expression) });
	}

	const sourceMembers = DEither.unwrapRight(getUnionMemberGoTypes(fromGoType));

	if (!DEither.isLeft(sourceMembers)) {
		return convertUnion({
			expression,
			fromGoType,
			toGoType,
			sourceMembers,
			targetMembers,
			requireAll: true,
		}, context);
	}

	// Membre convertible (ex. Either[float64] vers un membre Either2) : un seul candidat.
	const candidates: {
		index: number;
		result: GoAST.Expression;
	}[] = [];

	for (const [memberIndex, member] of targetMembers.entries()) {
		if (DEither.isLeft(getUnionMemberGoTypes(member)) && renderGoType(member) !== renderGoType(fromGoType)) {
			const converted = await coerceGoExpression({
				expression,
				fromGoType,
				toGoType: member,
				from: params.from,
			}, context);

			if (!DEither.isLeft(converted)) {
				candidates.push({
					index: memberIndex,
					result: DEither.unwrapRight(converted).result,
				});
			}
		}
	}

	const candidate = candidates.length === 1 ? candidates[0] : undefined;

	return candidate
		? context.success({ result: createUnionValue(toGoType, candidate.index, candidate.result) })
		: context.notSupport();
}

/**
 * ADR-14 : struct vers struct (typage structurel de TS) :
 * `func(s From) To { return To{P_a: conv(s.P_a), …} }(x)`. Un champ absent de la
 * source doit être optionnel dans la cible (il vaut alors undefined) ; un champ
 * en trop dans la source est ignoré, comme l'autorise TypeScript.
 */
async function convertStruct(
	params: {
		readonly expression: GoAST.Expression;
		readonly fromGoType: GoType;
		readonly sourceFields: readonly StructField[];
		readonly toGoType: GoType;
		readonly targetFields: readonly StructField[];
	},
	context: BuildContext,
): Promise<CoerceResult> {
	const { expression, fromGoType, sourceFields, toGoType, targetFields } = params;
	const parameter = context.generateIdentifier();
	const elements: (readonly [GoAST.Identifier, GoAST.Expression])[] = [];

	for (const field of targetFields) {
		const source = sourceFields.find((known) => known.name === field.name);

		if (!source) {
			const absent = createAbsentFieldValue(field, context);

			if (!field.optional || !absent) {
				return context.notSupport();
			}

			elements.push([field.identifier, absent]);
			continue;
		}

		const read = go.select(parameter, source.identifier);
		const converted = renderGoType(source.goType) === renderGoType(field.goType)
			? context.success({ result: read })
			: await coerceGoExpression({
				expression: read,
				fromGoType: source.goType,
				toGoType: field.goType,
			}, context);

		if (DEither.isLeft(converted)) {
			return converted;
		}

		elements.push([field.identifier, DEither.unwrapRight(converted).result]);
	}

	return context.success({
		result: go.call(
			go.functionLiteral(
				[go.argument(parameter, fromGoType)],
				toGoType,
				[go.return(go.struct(toGoType, elements))],
			),
			[expression],
		),
	});
}

/** Fonction Go `func(p From) To` qui applique la coercition `From -> To`. */
async function createConverter(
	fromGoType: GoType,
	toGoType: GoType,
	possible: boolean,
	context: BuildContext,
): Promise<GoAST.Expression | undefined> {
	const parameter = context.generateIdentifier();
	const converted = await coerceGoExpression({
		expression: parameter,
		fromGoType,
		toGoType,
	}, context);

	if (!DEither.isLeft(converted)) {
		return go.functionLiteral(
			[go.argument(parameter, fromGoType)],
			toGoType,
			[go.return(DEither.unwrapRight(converted).result)],
		);
	}

	return possible
		? undefined
		: go.functionLiteral(
			[go.argument(GoAST.createIdentifier("_"), fromGoType)],
			toGoType,
			[...go.zeroValueReturn(toGoType)],
		);
}

async function getSidePossibilities(from: Type | undefined, context: BuildContext) {
	if (!from) {
		return {
			right: true,
			valuedLeft: true,
		};
	}

	const names = await eitherVariantNames(from, context);

	return {
		right: DArray.some(names, (name) => name === undefined || name === "Success" || name === "Right"),
		valuedLeft: DArray.some(names, (name) => name === "Left"),
	};
}

async function coerceGoExpressionExtended(
	params: CoerceGoExpressionParams,
	context: BuildContext,
): Promise<CoerceResult> {
	const { expression, fromGoType, toGoType, from } = params;

	const targetMembers = DEither.unwrapRight(getUnionMemberGoTypes(toGoType));

	if (!DEither.isLeft(targetMembers)) {
		return coerceToUnion(params, targetMembers, context);
	}

	const targetFields = DEither.unwrapRight(getStructFields(toGoType));
	const sourceFields = DEither.unwrapRight(getStructFields(fromGoType));

	if (!DEither.isLeft(targetFields) && !DEither.isLeft(sourceFields)) {
		return convertStruct({
			expression,
			fromGoType,
			sourceFields,
			toGoType,
			targetFields,
		}, context);
	}

	const sourceMembers = DEither.unwrapRight(getUnionMemberGoTypes(fromGoType));

	if (!DEither.isLeft(sourceMembers)) {
		// Union rétrécie par TypeScript : membre (`x.Vi`) ou sous-union.
		return narrowUnionExpression(expression, fromGoType, toGoType, context);
	}

	const toEither2 = DEither.unwrapRight(getEither2GoTypes(toGoType));
	const fromEither2 = DEither.unwrapRight(getEither2GoTypes(fromGoType));
	const fromValue = DEither.unwrapRight(getEitherValueGoType(fromGoType));
	const possibilities = await getSidePossibilities(from, context);
	const conversionPackage = () => context.registerSharedDependency(eitherConversionDependency.value);

	if (!DEither.isLeft(toEither2)) {
		if (!DEither.isLeft(fromEither2)) {
			const left = await createConverter(
				fromEither2.leftType,
				toEither2.leftType,
				possibilities.valuedLeft,
				context,
			);
			const right = await createConverter(
				fromEither2.rightType,
				toEither2.rightType,
				possibilities.right,
				context,
			);

			return left && right
				? context.success({
					result: go.call(
						go.instantiate(
							go.select(conversionPackage(), either2MapFunctionIdentifier),
							[toEither2.leftType, toEither2.rightType, fromEither2.leftType, fromEither2.rightType],
						),
						[expression, left, right],
					),
				})
				: context.notSupport();
		}

		if (!DEither.isLeft(fromValue)) {
			const left = await createConverter(fromValue, toEither2.leftType, possibilities.valuedLeft, context);
			const right = await createConverter(fromValue, toEither2.rightType, possibilities.right, context);

			return left && right
				? context.success({
					result: go.call(
						go.instantiate(
							go.select(conversionPackage(), either2FromEitherFunctionIdentifier),
							[toEither2.leftType, toEither2.rightType, fromValue],
						),
						[expression, left, right],
					),
				})
				: context.notSupport();
		}

		// Valeur nue vers Either2 : forme Plain, côté droit.
		const plain = await coerceGoExpression({
			expression,
			fromGoType,
			toGoType: toEither2.rightType,
		}, context);

		if (DEither.isLeft(plain)) {
			return plain;
		}

		return context.success({
			result: go.call(
				go.instantiate(
					go.select(conversionPackage(), either2PlainOfFunctionIdentifier),
					[toEither2.leftType, toEither2.rightType],
				),
				[DEither.unwrapRight(plain).result],
			),
		});
	}

	const toValue = DEither.unwrapRight(getEitherValueGoType(toGoType));

	if (DEither.isLeft(toValue)) {
		return context.notSupport();
	}

	if (!DEither.isLeft(fromValue) && DEither.isLeft(fromEither2)) {
		const convert = await createConverter(fromValue, toValue, true, context);

		return convert
			? context.success({
				result: go.call(
					go.instantiate(
						go.select(conversionPackage(), eitherMapFunctionIdentifier),
						[toValue, fromValue],
					),
					[expression, convert],
				),
			})
			: context.notSupport();
	}

	if (DEither.isLeft(fromValue)) {
		// Valeur nue convertible vers V (ex. V union étiquetée) : forme Plain.
		const plain = await coerceGoExpression({
			expression,
			fromGoType,
			toGoType: toValue,
		}, context);

		if (DEither.isLeft(plain)) {
			return plain;
		}

		return context.success({
			result: go.call(
				go.instantiate(
					go.select(context.registerSharedDependency(eitherDependency.value), eitherPlainFunctionIdentifier),
					[toValue],
				),
				[DEither.unwrapRight(plain).result],
			),
		});
	}

	return context.notSupport();
}

/**
 * Côté (gauche ou droite) de chaque `information` d'un type Either TS :
 * `Left<"negative", string>` donne `negative -> left`, `Success<V>` donne
 * `success -> right`. Sert à lire le bon champ d'un Either2 (ADR-13).
 */
export async function eitherInformationSides(type: Type, context: BuildContext) {
	const sides = new Map<string, "left" | "right">([
		["success", "right"],
		["fail", "left"],
	]);
	const members = type.isUnionType() ? await type.getTypes() : [type];
	const { typeChecker } = context.transpilation;

	for (const member of members) {
		const names = await eitherVariantNames(member, context);
		const name = DArray.first(names);

		if (name !== "Left" && name !== "Right") {
			continue;
		}

		// L'API ne rend pas les arguments d'alias d'un type inféré : l'information
		// est lue dans le texte du type (`Left<"negative", …>`), reconnu par symbole.
		const text = await typeChecker.typeToString(member);
		const literal = /^(?:[\w$]+\.)?(?:Left|Right)<"(?<value>(?:[^"\\]|\\.)*)"/.exec(text)?.groups?.value;

		if (literal !== undefined && literal !== "") {
			sides.set(literal, name === "Left" ? "left" : "right");
		}
	}

	return sides;
}

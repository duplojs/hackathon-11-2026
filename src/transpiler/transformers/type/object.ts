import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import { type BuildContext } from "../../context/build";
import { undefinedShardDependency } from "../../sharedDependency/defaults/undefined";
import { type GoType } from "./goTypeOf";
import { createUnionGoType, createUnionValue, findUnionMemberIndex, getUnionMemberGoTypes } from "./taggedUnion";

/**
 * Objets (ADR-14) : un type objet TS (`{ name: string; age?: number }`,
 * interface) devient une STRUCT ANONYME Go, passée par valeur :
 *
 * ```go
 * struct {
 *     P_name string "js:\"name\""
 *     P_age shard_dependencies.Union2[float64, shard_dependencies.JSUndefined] "js:\"age,optional\""
 * }
 * ```
 *
 * - Les champs gardent l'ORDRE DES PROPRIÉTÉS du type TS : c'est l'ordre
 *   d'affichage de `print` (util.inspect suit l'ordre d'insertion).
 * - Le nom Go est dérivé du nom JS (préfixe `P_`, exporté) ; le tag porte le nom
 *   JS exact, lu par l'affichage.
 * - Une propriété optionnelle est une union avec `undefined` ; absente (étiquette
 *   undefined), elle n'est pas affichée, comme en JS.
 * - Deux structs anonymes de mêmes champs (même ordre) sont le MÊME type Go :
 *   le typage structurel de TS est conservé sans nommer les types.
 */

export interface StructField {
	readonly name: string;
	readonly optional: boolean;
	readonly identifier: GoAST.Identifier;
	readonly goType: GoType;
}

export function createFieldIdentifier(name: string) {
	const sanitized = name.replace(
		/[^a-zA-Z0-9_]/g,
		(character) => `_${character.codePointAt(0)!.toString(16)}_`,
	);

	return GoAST.createIdentifier(`P_${sanitized}`);
}

function createFieldTag(name: string, optional: boolean) {
	return `js:"${name.replace(/["\\]/g, (character) => `\\${character}`)}${optional ? ",optional" : ""}"`;
}

export function createStructGoType(fields: readonly Omit<StructField, "identifier">[]) {
	return GoAST.createStructType({
		fields: fields.map((field) => GoAST.createStructField({
			identifier: createFieldIdentifier(field.name),
			typeReference: field.goType as Parameters<typeof GoAST.createStructField>[0]["typeReference"],
			tag: createFieldTag(field.name, field.optional),
		})),
	});
}

/** Champs d'une struct produite par createStructGoType (lus dans les tags). */
export function getStructFields(goType: GoType): DEither.Maybe<readonly StructField[]> {
	if (!DModeling.hasTagValue(goType, "[node][type]struct")) {
		return DEither.none();
	}

	const fields: StructField[] = [];

	for (const field of goType.fields) {
		if (!DModeling.hasTagValue(field, "[node]struct-field") || field.tag === undefined) {
			return DEither.none();
		}

		const parsed = /^js:"(?<name>(?:[^"\\]|\\.)*?)(?<optional>,optional)?"$/.exec(field.tag);

		if (!parsed?.groups) {
			return DEither.none();
		}

		fields.push({
			name: parsed.groups.name!.replace(/\\(.)/g, "$1"),
			optional: parsed.groups.optional !== undefined,
			identifier: field.identifier,
			goType: field.typeReference as GoType,
		});
	}

	return DEither.some(fields);
}

export function createUndefinedGoType(context: BuildContext) {
	return GoAST.createPackageTypeReference({
		packageName: context.registerSharedDependency(undefinedShardDependency.value),
		identifier: GoAST.createIdentifier("JSUndefined"),
	});
}

function getMemberName(name: TsAST.PropertyName) {
	if (TsAST.isIdentifier(name) || TsAST.isStringLiteral(name) || TsAST.isNumericLiteral(name)) {
		return name.text;
	}

	return undefined;
}

/**
 * Membres d'un type objet (littéral de type ou interface) vers une struct.
 * Seules les propriétés sont représentables : une méthode, une signature
 * d'index ou d'appel est refusée explicitement.
 */
export async function transformObjectMembers(
	members: readonly TsAST.TypeElement[],
	context: BuildContext,
	inherited: readonly Omit<StructField, "identifier">[] = [],
) {
	const fields = [...inherited];

	for (const member of members) {
		const name = TsAST.isPropertySignatureDeclaration(member) ? getMemberName(member.name) : undefined;

		if (!TsAST.isPropertySignatureDeclaration(member) || name === undefined || !member.type) {
			return context.error(member, "object-member-not-supported");
		}

		const fieldType = DEither.unwrapRight(await context.transform(member.type, typeTransformers.value));

		if (DEither.isLeft(fieldType)) {
			return fieldType;
		}

		const optional = member.postfixToken?.kind === TsAST.SyntaxKind.QuestionToken;
		const goType = optional
			? createUnionGoType([fieldType.result, createUndefinedGoType(context)], context)
			: fieldType.result;

		if (!goType) {
			return context.error(member, "object-member-not-supported");
		}

		const field = {
			name,
			optional,
			goType,
		};
		const existing = fields.findIndex((known) => known.name === name);

		// Redéfinition (extends, fusion d'interfaces) : même position, nouveau type.
		if (existing >= 0) {
			fields[existing] = field;
		} else {
			fields.push(field);
		}
	}

	return context.success({ result: createStructGoType(fields) });
}

export const objectTypeLiteralTransformer: Transformer<GoAST.Type> = createTransformer(
	(node, context) => {
		if (!TsAST.isTypeLiteralNode(node)) {
			return context.notSupport();
		}

		return transformObjectMembers(node.members, context);
	},
);

/** Valeur `undefined` d'un champ optionnel absent (struct vers struct). */
export function createAbsentFieldValue(field: StructField, context: BuildContext) {
	const members = DEither.unwrapRight(getUnionMemberGoTypes(field.goType));

	if (DEither.isLeft(members)) {
		return undefined;
	}

	const index = findUnionMemberIndex(members, createUndefinedGoType(context));

	return index < 0
		? undefined
		: createUnionValue(field.goType, index, GoAST.createStructLiteral({
			typeReference: createUndefinedGoType(context),
			elements: [],
		}));
}


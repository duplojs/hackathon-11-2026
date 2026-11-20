import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST, GoPrinter } from "@go";
import {
	createSharedDependency,
	type SharedDependency,
	type TransformationNotSupported,
	type TransformationSuccess,
} from "@transformer";
import { type BuildContext } from "../../context/build";
import { type GoType } from "./goTypeOf";
import { goBuilder as go } from "./goBuilder";

/**
 * Union fermée ÉTIQUETÉE (ADR-13) : `string | number` devient
 * `UnionN[T0, …]{ Tag uint8; V0 T0; … }`, passée PAR VALEUR (aucune allocation,
 * contrairement à une interface : ADR-1, 5 à 8 fois plus lent).
 *
 * - Les membres sont triés par rendu Go et dédoublonnés : `string | number` et
 *   `number | string` donnent le MÊME type Go, quel que soit le fichier.
 * - Le type est générique et déclaré une fois par arité dans shard_dependencies :
 *   aucun nom de type à inventer, aucun conflit entre fichiers.
 * - `Tag` désigne le champ actif ; `InspectPlain` rend la valeur active (print).
 */

export const unionTagField = GoAST.createIdentifier("Tag");

export function unionValueField(index: number) {
	return GoAST.createIdentifier(`V${index}`);
}

const unionTypeIdentifiers = new Map<number, GoAST.Identifier>();
const unionDependencies = new Map<number, SharedDependency>();

function getUnionTypeIdentifier(arity: number) {
	const known = unionTypeIdentifiers.get(arity);

	if (known) {
		return known;
	}

	const identifier = GoAST.createIdentifier(`Union${arity}`);
	unionTypeIdentifiers.set(arity, identifier);

	return identifier;
}

function createUnionDependency(arity: number) {
	const typeIdentifier = getUnionTypeIdentifier(arity);
	const typeParameters = Array.from(
		{ length: arity },
		(_unused, index) => go.typeParameter(GoAST.createIdentifier(`T${index}`)),
	);
	const selfType = go.genericType(
		typeIdentifier,
		DArray.map(typeParameters, ({ identifier }) => identifier),
	);
	const receiver = GoAST.createIdentifier("u");

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeDefinition({
				identifier: typeIdentifier,
				generic: typeParameters,
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: unionTagField,
							typeReference: GoAST.builtinTypeReferences.uint8,
						}),
						...typeParameters.map(({ identifier }, index) => GoAST.createStructField({
							identifier: unionValueField(index),
							typeReference: identifier,
						})),
					],
				}),
			}),
			GoAST.createMethodDeclaration({
				identifier: GoAST.createIdentifier("InspectPlain"),
				receiver: [receiver, selfType],
				generic: [],
				arguments: [],
				returnTypes: [GoAST.builtinTypeReferences.any, GoAST.builtinTypeReferences.bool],
				body: go.block([
					...typeParameters.slice(0, -1).map(
						(_unused, index) => go.if(
							go.equal(go.select(receiver, unionTagField), go.integer(index)),
							[
								go.return(
									go.select(receiver, unionValueField(index)),
									GoAST.createBooleanLiteral({ value: true }),
								),
							],
						),
					),
					go.return(
						go.select(receiver, unionValueField(arity - 1)),
						GoAST.createBooleanLiteral({ value: true }),
					),
				]),
			}),
		],
	});
}

export function getUnionDependency(arity: number) {
	const known = unionDependencies.get(arity);

	if (known) {
		return known;
	}

	const dependency = createUnionDependency(arity);
	unionDependencies.set(arity, dependency);

	return dependency;
}

export function renderGoType(goType: GoType) {
	return GoPrinter.renderNode(goType);
}

/** Membres distincts, dans l'ordre canonique (rendu Go trié). */
export function canonicalUnionMembers(goTypes: readonly GoType[]) {
	const byRender = new Map<string, GoType>();

	for (const goType of goTypes) {
		const members = DEither.unwrapRight(getUnionMemberGoTypes(goType));
		// Union imbriquée (`A | (B | C)`) : aplatie.
		for (const member of DEither.isLeft(members) ? [goType] : members) {
			const render = renderGoType(member);

			if (!byRender.has(render)) {
				byRender.set(render, member);
			}
		}
	}

	return [...byRender.entries()]
		.sort(([left], [right]) => left.localeCompare(right, "en"))
		.map(([, goType]) => goType);
}

/**
 * Type Go d'une union de types Go : le type lui-même s'il n'y en a qu'un,
 * sinon `shard_dependencies.UnionN[…]` (membres canoniques).
 */
export function createUnionGoType(goTypes: readonly GoType[], context: BuildContext): GoType | undefined {
	const members = canonicalUnionMembers(goTypes);
	const first = DArray.first(members);

	if (!first) {
		return undefined;
	}

	if (members.length === 1) {
		return first;
	}

	const packageName = context.registerSharedDependency(getUnionDependency(members.length));

	return go.genericType(
		GoAST.createPackageTypeReference({
			packageName,
			identifier: getUnionTypeIdentifier(members.length),
		}),
		members,
	);
}

/** Membres d'un `UnionN[…]` produit par createUnionGoType (reconnu par identité). */
export function getUnionMemberGoTypes(goType: GoType): DEither.Maybe<readonly GoType[]> {
	if (
		!DModeling.hasTagValue(goType, "[node]type-reference-generic")
		|| !DModeling.hasTagValue(goType.typeReference, "[node]type-reference-package")
	) {
		return DEither.none();
	}

	const arity = goType.typeArguments.length;

	return unionTypeIdentifiers.get(arity) === goType.typeReference.identifier
		? DEither.some(goType.typeArguments as readonly GoType[])
		: DEither.none();
}

export function findUnionMemberIndex(members: readonly GoType[], goType: GoType) {
	const render = renderGoType(goType);

	return members.findIndex((member) => renderGoType(member) === render);
}

/** `UnionN[…]{ Tag: i, Vi: value }`. */
export function createUnionValue(unionGoType: GoType, index: number, value: GoAST.Expression) {
	return go.struct(unionGoType, [
		[unionTagField, go.integer(index)],
		[unionValueField(index), value],
	]);
}

/**
 * Résultat de `typeof` en JS pour une valeur de ce type Go (connu à la
 * transpilation). `undefined` : type non reconnu.
 */
export function jsTypeOfGoType(goType: GoType): string | undefined {
	const render = renderGoType(goType);

	if (render === "string") {
		return "string";
	}

	if (render === "float64") {
		return "number";
	}

	if (render === "bool") {
		return "boolean";
	}

	if (/(?:^|\.)JSUndefined$/.test(render)) {
		return "undefined";
	}

	if (DModeling.hasTagValue(goType, "[node][type]function")) {
		return "function";
	}

	return "object";
}

/** Membres « nuls » au sens de `??` : undefined et null. */
export function isNullishGoType(goType: GoType) {
	return /(?:^|\.)JS(?:Undefined|Null)$/.test(renderGoType(goType));
}

/**
 * `func(u From) To { if u.Tag == i { return To{Tag: j, Vj: u.Vi} } … }(x)`.
 * requireAll : chaque membre source doit exister dans la cible (élargissement) ;
 * sinon (rétrécissement), les membres absents sont exclus par TypeScript.
 */
export function convertUnion(
	params: {
		readonly expression: GoAST.Expression;
		readonly fromGoType: GoType;
		readonly toGoType: GoType;
		readonly sourceMembers: readonly GoType[];
		readonly targetMembers: readonly GoType[] | undefined;
		readonly requireAll: boolean;
	},
	context: BuildContext,
): TransformationSuccess<GoAST.Expression> | TransformationNotSupported {
	const parameter = context.generateIdentifier();
	const statements: GoAST.Statement[] = [];
	let matched = 0;

	for (const [sourceIndex, member] of params.sourceMembers.entries()) {
		const value = go.select(parameter, unionValueField(sourceIndex));
		const isTarget = renderGoType(member) === renderGoType(params.toGoType);
		const targetIndex = params.targetMembers
			? findUnionMemberIndex(params.targetMembers, member)
			: Number(isTarget) - 1;

		if (targetIndex < 0) {
			if (params.requireAll) {
				return context.notSupport();
			}
			continue;
		}

		matched += 1;
		statements.push(go.if(
			go.equal(go.select(parameter, unionTagField), go.integer(sourceIndex)),
			[go.return(params.targetMembers ? createUnionValue(params.toGoType, targetIndex, value) : value)],
		));
	}

	if (matched === 0) {
		return context.notSupport();
	}

	return context.success({
		result: go.call(
			go.functionLiteral(
				[go.argument(parameter, params.fromGoType)],
				params.toGoType,
				[...statements, ...go.zeroValueReturn(params.toGoType)],
			),
			[params.expression],
		),
	});
}

/**
 * Lecture d'une union RÉTRÉCIE par TypeScript (après `typeof x === "string"`,
 * `x !== undefined`…) : membre unique (`x.Vi`) ou sous-union.
 */
export function narrowUnionExpression(
	expression: GoAST.Expression,
	fromGoType: GoType,
	toGoType: GoType,
	context: BuildContext,
) {
	const sourceMembers = DEither.unwrapRight(getUnionMemberGoTypes(fromGoType));

	if (DEither.isLeft(sourceMembers)) {
		return context.notSupport();
	}

	const index = findUnionMemberIndex(sourceMembers, toGoType);

	if (index >= 0) {
		return context.success({ result: go.select(expression, unionValueField(index)) });
	}

	const targetMembers = DEither.unwrapRight(getUnionMemberGoTypes(toGoType));

	return convertUnion({
		expression,
		fromGoType,
		toGoType,
		sourceMembers,
		targetMembers: DEither.isLeft(targetMembers) ? undefined : targetMembers,
		requireAll: false,
	}, context);
}

/** Le rétrécissement `from -> to` est-il une lecture valide (membre ou sous-union) ? */
export function canNarrowUnion(fromGoType: GoType, toGoType: GoType) {
	const sourceMembers = DEither.unwrapRight(getUnionMemberGoTypes(fromGoType));

	if (DEither.isLeft(sourceMembers)) {
		return false;
	}

	const targetMembers = DEither.unwrapRight(getUnionMemberGoTypes(toGoType));

	return DEither.isLeft(targetMembers)
		? findUnionMemberIndex(sourceMembers, toGoType) >= 0
		: targetMembers.every((member) => findUnionMemberIndex(sourceMembers, member) >= 0);
}

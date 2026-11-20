import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { createSharedDependency, type SharedDependency } from "@transformer";
import type { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { type GoType } from "../../../type";
import { createUnionTypeIdentifier, createUnionValueIdentifier, unionTagIdentifier } from "../../../type/union/sharedDependency";
import { successTypeIdentifier } from "../../either/success/sharedDependency";
import { failTypeIdentifier } from "../../either/fail/sharedDependency";
import { leftTypeIdentifier } from "../../either/left/sharedDependency";
import { rightTypeIdentifier } from "../../either/right/sharedDependency";
import { errorTypeIdentifier } from "../../either/error/sharedDependency";
import {
	inspectDependency,
	inspectEntriesIdentifier,
	inspectNullIdentifier,
	inspectNumberIdentifier,
	inspectStringIdentifier,
	inspectUndefinedIdentifier,
	inspectorBuilders,
	inspectorType,
} from "./sharedDependency";

const {
	identifier,
	stringLiteral,
	integerLiteral,
	binary,
	concatenate,
	call,
	member,
	block,
	returnValue,
	ifThen,
	argument,
} = inspectorBuilders;

const inspectEitherSuccessIdentifier = GoAST.createIdentifier("InspectEitherSuccess");
const inspectEitherFailIdentifier = GoAST.createIdentifier("InspectEitherFail");
const inspectEitherLeftIdentifier = GoAST.createIdentifier("InspectEitherLeft");
const inspectSliceIdentifier = GoAST.createIdentifier("InspectSlice");

const createInspectUnionIdentifier = (arity: number) => GoAST.createIdentifier(`InspectUnion${arity}`);

// Clé d'un `kind` Either telle que l'affiche Node (clé non identifiante, donc entre quotes).
const eitherEntry = (name: string) => stringLiteral(`'@duplojs/lang/kind/@DuplojsLangEither/${name}': `);

const createEitherObject = (
	entries: readonly GoAST.Expression[],
	indentation: GoAST.Expression,
) => call(
	inspectEntriesIdentifier,
	GoAST.createSliceLiteral({
		typeReference: GoAST.createSliceType({ elementType: GoAST.builtinTypeReferences.string }),
		elements: entries,
	}),
	indentation,
	stringLiteral("{"),
	stringLiteral("}"),
);

// Les valeurs imbriquées sont indentées de deux espaces supplémentaires, comme dans Node.
const nested = (indentation: GoAST.Expression) => binary(indentation, "+", integerLiteral(2));

const successInspectorDependency = DCommon.memo(() => {
	const generic = identifier("T");
	const inspectValue = identifier("inspectValue");
	const value = identifier("value");
	const indentation = identifier("indentation");
	const successType = GoAST.createGenericTypeReference({
		typeReference: successTypeIdentifier,
		typeArguments: DCommon.cast([generic]),
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: inspectEitherSuccessIdentifier,
				generic: [
					GoAST.createTypeParameter({
						identifier: generic,
						constraint: GoAST.builtinTypeReferences.any,
					}),
				],
				arguments: [argument(inspectValue, inspectorType(generic))],
				returnTypes: [inspectorType(successType)],
				body: block(
					returnValue(
						GoAST.createFunctionLiteral({
							arguments: [
								argument(value, successType),
								argument(indentation, GoAST.builtinTypeReferences.int),
							],
							returnTypes: [GoAST.builtinTypeReferences.string],
							body: block(
								returnValue(
									createEitherObject(
										[
											concatenate(eitherEntry("right"), stringLiteral("null")),
											concatenate(
												eitherEntry("information"),
												call(inspectStringIdentifier, member(value, "Information"), nested(indentation)),
											),
											concatenate(
												eitherEntry("value"),
												call(inspectValue, member(value, "Value"), nested(indentation)),
											),
											concatenate(eitherEntry("success"), stringLiteral("null")),
										],
										indentation,
									),
								),
							),
						}),
					),
				),
			}),
		],
	});
});

const failInspectorDependency = DCommon.memo(() => {
	const value = identifier("value");
	const indentation = identifier("indentation");

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: inspectEitherFailIdentifier,
				generic: [],
				arguments: [
					argument(value, failTypeIdentifier),
					argument(indentation, GoAST.builtinTypeReferences.int),
				],
				returnTypes: [GoAST.builtinTypeReferences.string],
				body: block(
					returnValue(
						createEitherObject(
							[
								concatenate(eitherEntry("left"), stringLiteral("null")),
								concatenate(
									eitherEntry("information"),
									call(inspectStringIdentifier, member(value, "Information"), nested(indentation)),
								),
								concatenate(eitherEntry("value"), stringLiteral("undefined")),
								concatenate(eitherEntry("fail"), stringLiteral("null")),
							],
							indentation,
						),
					),
				),
			}),
		],
	});
});

const leftInspectorDependency = DCommon.memo(() => {
	const generic = identifier("T");
	const inspectValue = identifier("inspectValue");
	const value = identifier("value");
	const indentation = identifier("indentation");
	const leftType = GoAST.createGenericTypeReference({
		typeReference: leftTypeIdentifier,
		typeArguments: DCommon.cast([generic]),
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: inspectEitherLeftIdentifier,
				generic: [
					GoAST.createTypeParameter({
						identifier: generic,
						constraint: GoAST.builtinTypeReferences.any,
					}),
				],
				arguments: [argument(inspectValue, inspectorType(generic))],
				returnTypes: [inspectorType(leftType)],
				body: block(
					returnValue(
						GoAST.createFunctionLiteral({
							arguments: [
								argument(value, leftType),
								argument(indentation, GoAST.builtinTypeReferences.int),
							],
							returnTypes: [GoAST.builtinTypeReferences.string],
							body: block(
								returnValue(
									createEitherObject(
										[
											concatenate(eitherEntry("left"), stringLiteral("null")),
											concatenate(
												eitherEntry("information"),
												call(inspectStringIdentifier, member(value, "Information"), nested(indentation)),
											),
											concatenate(
												eitherEntry("value"),
												call(inspectValue, member(value, "Value"), nested(indentation)),
											),
										],
										indentation,
									),
								),
							),
						}),
					),
				),
			}),
		],
	});
});

// Inspecteur d'une variante Either générique sur sa valeur : les clés `kind` vides avant et
// après l'information et la valeur, dans l'ordre où DuploJS les crée (et où Node les affiche).
function createEitherInspectorDependency(
	inspectorIdentifier: GoAST.Identifier,
	typeIdentifier: GoAST.Identifier,
	kindsBefore: readonly string[],
	kindsAfter: readonly string[],
) {
	const generic = identifier("T");
	const inspectValue = identifier("inspectValue");
	const value = identifier("value");
	const indentation = identifier("indentation");
	const eitherType = GoAST.createGenericTypeReference({
		typeReference: typeIdentifier,
		typeArguments: DCommon.cast([generic]),
	});
	const kindEntry = (kind: string) => concatenate(eitherEntry(kind), stringLiteral("null"));

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: inspectorIdentifier,
				generic: [
					GoAST.createTypeParameter({
						identifier: generic,
						constraint: GoAST.builtinTypeReferences.any,
					}),
				],
				arguments: [argument(inspectValue, inspectorType(generic))],
				returnTypes: [inspectorType(eitherType)],
				body: block(
					returnValue(
						GoAST.createFunctionLiteral({
							arguments: [
								argument(value, eitherType),
								argument(indentation, GoAST.builtinTypeReferences.int),
							],
							returnTypes: [GoAST.builtinTypeReferences.string],
							body: block(
								returnValue(
									createEitherObject(
										[
											...DArray.map(kindsBefore, kindEntry),
											concatenate(
												eitherEntry("information"),
												call(inspectStringIdentifier, member(value, "Information"), nested(indentation)),
											),
											concatenate(
												eitherEntry("value"),
												call(inspectValue, member(value, "Value"), nested(indentation)),
											),
											...DArray.map(kindsAfter, kindEntry),
										],
										indentation,
									),
								),
							),
						}),
					),
				),
			}),
		],
	});
}

const inspectEitherRightIdentifier = GoAST.createIdentifier("InspectEitherRight");
const inspectEitherErrorIdentifier = GoAST.createIdentifier("InspectEitherError");

const rightInspectorDependency = DCommon.memo(
	() => createEitherInspectorDependency(inspectEitherRightIdentifier, rightTypeIdentifier, ["right"], []),
);

const errorInspectorDependency = DCommon.memo(
	() => createEitherInspectorDependency(inspectEitherErrorIdentifier, errorTypeIdentifier, ["left"], ["error"]),
);

// Un tableau s'affiche comme dans Node : `[ 'a', 'b' ]` sur une ligne si les entrées tiennent,
// sinon une entrée par ligne. Chaque élément est affiché par l'inspecteur de son type.
const sliceInspectorDependency = DCommon.memo(() => {
	const generic = identifier("T");
	const inspectValue = identifier("inspectValue");
	const value = identifier("value");
	const indentation = identifier("indentation");
	const entries = identifier("entries");
	const index = identifier("index");
	const element = identifier("element");
	const sliceType = GoAST.createSliceType({ elementType: generic });
	const stringSlice = GoAST.createSliceType({ elementType: GoAST.builtinTypeReferences.string });

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: inspectSliceIdentifier,
				generic: [
					GoAST.createTypeParameter({
						identifier: generic,
						constraint: GoAST.builtinTypeReferences.any,
					}),
				],
				arguments: [argument(inspectValue, inspectorType(generic))],
				returnTypes: [inspectorType(sliceType)],
				body: block(
					returnValue(
						GoAST.createFunctionLiteral({
							arguments: [
								argument(value, sliceType),
								argument(indentation, GoAST.builtinTypeReferences.int),
							],
							returnTypes: [GoAST.builtinTypeReferences.string],
							body: block(
								GoAST.createShortVariableDeclarationStatement({
									identifier: entries,
									initializer: GoAST.createCallExpression({
										callee: identifier("make"),
										typeArgument: stringSlice,
										arguments: [call(identifier("len"), value)],
									}),
								}),
								GoAST.createRangeStatement({
									binding: GoAST.createRangeDeclaration({
										key: index,
										value: element,
									}),
									expression: value,
									body: block(
										GoAST.createAssignmentStatement({
											targets: DCommon.cast([
												GoAST.createIndexExpression({
													target: entries,
													index,
												}),
											]),
											values: DCommon.cast([call(inspectValue, element, nested(indentation))]),
										}),
									),
								}),
								returnValue(
									call(inspectEntriesIdentifier, entries, indentation, stringLiteral("["), stringLiteral("]")),
								),
							),
						}),
					),
				),
			}),
		],
	});
});

// Une dépendance par arité : la déduplication du set global repose sur l'identité des objets.
const unionInspectorDependencies = new Map<number, SharedDependency>();

function getUnionInspectorDependency(arity: number) {
	const cached = unionInspectorDependencies.get(arity);

	if (cached) {
		return cached;
	}

	const generics = DArray.map(
		DArray.from({ length: arity }),
		(_element, { index }) => identifier(`T${index}`),
	);
	const inspectorIdentifier = (index: number) => identifier(`inspect${index}`);
	const value = identifier("value");
	const indentation = identifier("indentation");
	const unionType = GoAST.createGenericTypeReference({
		typeReference: createUnionTypeIdentifier(arity),
		typeArguments: DArray.minElements(generics, 1) ? generics : DCommon.cast([identifier("T0")]),
	});
	const inspectMember = (index: number) => returnValue(
		call(
			inspectorIdentifier(index),
			member(value, createUnionValueIdentifier(index).value),
			indentation,
		),
	);

	const dependency = createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: createInspectUnionIdentifier(arity),
				generic: DArray.map(
					generics,
					(generic) => GoAST.createTypeParameter({
						identifier: generic,
						constraint: GoAST.builtinTypeReferences.any,
					}),
				),
				arguments: DArray.map(
					generics,
					(generic, { index }) => argument(inspectorIdentifier(index), inspectorType(generic)),
				),
				returnTypes: [inspectorType(unionType)],
				body: block(
					returnValue(
						GoAST.createFunctionLiteral({
							arguments: [
								argument(value, unionType),
								argument(indentation, GoAST.builtinTypeReferences.int),
							],
							returnTypes: [GoAST.builtinTypeReferences.string],
							body: block(
								...DArray.map(
									DArray.from({ length: arity - 1 }),
									(_element, { index }) => ifThen(
										binary(member(value, unionTagIdentifier.value), "==", integerLiteral(index)),
										inspectMember(index),
									),
								),
								inspectMember(arity - 1),
							),
						}),
					),
				),
			}),
		],
	});

	unionInspectorDependencies.set(arity, dependency);

	return dependency;
}

function isBuiltin(type: GoType, reference: GoAST.Identifier) {
	return DModeling.hasTagValue(type, "[node]identifier") && type.value === reference.value;
}

function isSharedReference(
	type: GoType,
	reference: GoAST.Identifier,
): type is GoAST.PackageTypeReference {
	return DModeling.hasTagValue(type, "[node]type-reference-package")
		&& type.identifier.value === reference.value;
}

// Choisit à la compilation la fonction d'affichage correspondant au type Go statique de la valeur.
export function createInspector(
	type: GoType,
	location: TsAST.Node,
	context: BuildContext,
): DEither.Success<GoAST.Expression> | ReturnType<BuildContext["error"]> {
	const packageName = context.registerSharedDependency(inspectDependency.value);
	const shared = (functionIdentifier: GoAST.Identifier) => GoAST.createSelectorExpression({
		target: packageName,
		identifier: functionIdentifier,
	});

	if (isBuiltin(type, GoAST.builtinTypeReferences.float64)) {
		return DEither.success<GoAST.Expression>(shared(inspectNumberIdentifier));
	}

	if (isBuiltin(type, GoAST.builtinTypeReferences.string)) {
		return DEither.success<GoAST.Expression>(shared(inspectStringIdentifier));
	}

	if (isSharedReference(type, identifier("JSNull"))) {
		return DEither.success<GoAST.Expression>(shared(inspectNullIdentifier));
	}

	if (isSharedReference(type, identifier("JSUndefined"))) {
		return DEither.success<GoAST.Expression>(shared(inspectUndefinedIdentifier));
	}

	if (isSharedReference(type, failTypeIdentifier)) {
		context.registerSharedDependency(failInspectorDependency.value);

		return DEither.success<GoAST.Expression>(shared(inspectEitherFailIdentifier));
	}

	if (DModeling.hasTagValue(type, "[node][type]slice") || DModeling.hasTagValue(type, "[node][type]array")) {
		const elementInspector = createInspector(type.elementType, location, context);

		if (DEither.isLeft(elementInspector)) {
			return elementInspector;
		}

		context.registerSharedDependency(sliceInspectorDependency.value);

		const sliceInspector = call(shared(inspectSliceIdentifier), DEither.unwrapRight(elementInspector));

		if (DModeling.hasTagValue(type, "[node][type]slice")) {
			return DEither.success<GoAST.Expression>(sliceInspector);
		}

		// Un tuple (tableau Go de taille fixe) s'affiche comme un tableau : il est vu comme une slice.
		const value = identifier("value");
		const indentation = identifier("indentation");

		return DEither.success<GoAST.Expression>(
			GoAST.createFunctionLiteral({
				arguments: [
					argument(value, type),
					argument(indentation, GoAST.builtinTypeReferences.int),
				],
				returnTypes: [GoAST.builtinTypeReferences.string],
				body: block(
					returnValue(
						call(sliceInspector, GoAST.createSliceExpression({ target: value }), indentation),
					),
				),
			}),
		);
	}

	if (
		!DModeling.hasTagValue(type, "[node]type-reference-generic")
		|| !DModeling.hasTagValue(type.typeReference, "[node]type-reference-package")
	) {
		return context.error(location, "print-type-not-supported");
	}

	const genericName = type.typeReference.identifier.value;

	const argumentInspectors = DCommon.pipe(
		type.typeArguments,
		DArray.reduce(
			DArray.reduceFrom<readonly GoAST.Expression[]>([]),
			({ element, lastValue, next, exit }) => {
				const inspector = createInspector(element, location, context);

				return DEither.isLeft(inspector)
					? exit(inspector)
					: next(DArray.push(lastValue, DEither.unwrapRight(inspector)));
			},
		),
	);

	if (DEither.isLeft(argumentInspectors)) {
		return argumentInspectors;
	}

	if (genericName === successTypeIdentifier.value) {
		context.registerSharedDependency(successInspectorDependency.value);

		return DEither.success<GoAST.Expression>(
			call(shared(inspectEitherSuccessIdentifier), ...argumentInspectors),
		);
	}

	if (genericName === rightTypeIdentifier.value) {
		context.registerSharedDependency(rightInspectorDependency.value);

		return DEither.success<GoAST.Expression>(
			call(shared(inspectEitherRightIdentifier), ...argumentInspectors),
		);
	}

	if (genericName === errorTypeIdentifier.value) {
		context.registerSharedDependency(errorInspectorDependency.value);

		return DEither.success<GoAST.Expression>(
			call(shared(inspectEitherErrorIdentifier), ...argumentInspectors),
		);
	}

	if (genericName === leftTypeIdentifier.value) {
		context.registerSharedDependency(leftInspectorDependency.value);

		return DEither.success<GoAST.Expression>(
			call(shared(inspectEitherLeftIdentifier), ...argumentInspectors),
		);
	}

	if (genericName === createUnionTypeIdentifier(type.typeArguments.length).value) {
		context.registerSharedDependency(getUnionInspectorDependency(type.typeArguments.length));

		return DEither.success<GoAST.Expression>(
			call(shared(createInspectUnionIdentifier(type.typeArguments.length)), ...argumentInspectors),
		);
	}

	return context.error(location, "print-type-not-supported");
}


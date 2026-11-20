import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export interface CreateEitherDependencyParams {
	readonly typeIdentifier: GoAST.Identifier;
	readonly functionIdentifier: GoAST.Identifier;
	// Champs vides (`JSNull`) qui marquent le statut et la variante, dans l'ordre d'affichage de Node.
	readonly kinds: readonly string[];
	// Information imposée par la variante (`"error"`), ou reçue en paramètre du constructeur.
	readonly fixedInformation?: string;
}

const kindTag = (kind: string) => `json:"@duplojs/lang/kind/@DuplojsLangEither/${kind}"`;

// Variante Either générique sur sa valeur : une struct dont les champs vides sont placés en tête
// (pas de remplissage final, comme `EitherSuccess`), et son constructeur `…Of[T]`.
export function createEitherDependency(params: CreateEitherDependencyParams) {
	const { typeIdentifier, functionIdentifier, kinds, fixedInformation } = params;
	const generic = GoAST.createIdentifier("T");
	const nullType = GoAST.createIdentifier("JSNull");
	const information = GoAST.createIdentifier("information");
	const value = GoAST.createIdentifier("value");

	const typeParameter = GoAST.createTypeParameter({
		identifier: generic,
		constraint: GoAST.builtinTypeReferences.any,
	});

	const typeReference = GoAST.createGenericTypeReference({
		typeReference: typeIdentifier,
		typeArguments: DCommon.cast([generic]),
	});

	const kindFields = DArray.map(kinds, (kind) => GoAST.createStructField({
		identifier: GoAST.createIdentifier(DString.capitalize(kind)),
		typeReference: nullType,
		tag: kindTag(kind),
	}));

	const kindElements = DArray.map(kinds, (kind) => GoAST.createKeyedElement({
		key: GoAST.createIdentifier(DString.capitalize(kind)),
		value: GoAST.createStructLiteral({
			typeReference: nullType,
			elements: [],
		}),
	}));

	const functionArguments = fixedInformation === undefined
		? [
			GoAST.createFunctionArgument({
				identifier: information,
				type: GoAST.builtinTypeReferences.string,
			}),
			GoAST.createFunctionArgument({
				identifier: value,
				type: generic,
			}),
		]
		: [
			GoAST.createFunctionArgument({
				identifier: value,
				type: generic,
			}),
		];

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeAlias({
				identifier: typeIdentifier,
				generic: [typeParameter],
				type: GoAST.createStructType({
					fields: [
						...kindFields,
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Information"),
							typeReference: GoAST.builtinTypeReferences.string,
							tag: kindTag("information"),
						}),
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Value"),
							typeReference: generic,
							tag: kindTag("value"),
						}),
					],
				}),
			}),
			GoAST.createFunctionDeclaration({
				identifier: functionIdentifier,
				generic: [typeParameter],
				arguments: functionArguments,
				returnTypes: [typeReference],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference,
									elements: [
										...kindElements,
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Information"),
											value: fixedInformation === undefined
												? information
												: GoAST.createStringLiteral({ value: fixedInformation }),
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Value"),
											value,
										}),
									],
								}),
							],
						}),
					],
				}),
			}),
		],
	});
}

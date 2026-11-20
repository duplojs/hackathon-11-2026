import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const leftFunctionIdentifier = GoAST.createIdentifier("EitherLeftOf");
export const leftTypeIdentifier = GoAST.createIdentifier("EitherLeft");

// `DEither.left(information, value)` : une erreur identifiée par son information et portant
// son contexte. L'information est une chaîne à l'exécution ; son type littéral reste vérifié par TypeScript.
export const eitherLeftDependency = DCommon.memo(() => {
	const generic = GoAST.createIdentifier("T");
	const nullType = GoAST.createIdentifier("JSNull");
	const information = GoAST.createIdentifier("information");
	const value = GoAST.createIdentifier("value");

	const typeParameter = GoAST.createTypeParameter({
		identifier: generic,
		constraint: GoAST.builtinTypeReferences.any,
	});

	const leftTypeReference = GoAST.createGenericTypeReference({
		typeReference: leftTypeIdentifier,
		typeArguments: DCommon.cast([generic]),
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeAlias({
				identifier: leftTypeIdentifier,
				generic: [typeParameter],
				// Champ vide en tête, pour la même raison que `EitherSuccess` (pas de remplissage final).
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Left"),
							typeReference: nullType,
							tag: "json:\"@duplojs/lang/kind/@DuplojsLangEither/left\"",
						}),
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Information"),
							typeReference: GoAST.builtinTypeReferences.string,
							tag: "json:\"@duplojs/lang/kind/@DuplojsLangEither/information\"",
						}),
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Value"),
							typeReference: generic,
							tag: "json:\"@duplojs/lang/kind/@DuplojsLangEither/value\"",
						}),
					],
				}),
			}),
			GoAST.createFunctionDeclaration({
				identifier: leftFunctionIdentifier,
				generic: [typeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: information,
						type: GoAST.builtinTypeReferences.string,
					}),
					GoAST.createFunctionArgument({
						identifier: value,
						type: generic,
					}),
				],
				returnTypes: [leftTypeReference],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference: leftTypeReference,
									elements: [
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Left"),
											value: GoAST.createStructLiteral({
												typeReference: nullType,
												elements: [],
											}),
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Information"),
											value: information,
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
});

import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";
import { createEitherMethods } from "../sharedDependency";

export const leftFunctionIdentifier = GoAST.createIdentifier("EitherLeftOf");
export const leftTypeIdentifier = GoAST.createIdentifier("EitherLeft");

/**
 * ```go
 * type EitherLeft[T any] struct {
 *     Left        JSNull `json:".../left"`
 *     Information string `json:".../information"`
 *     Value       T      `json:".../value"`
 * }
 * func EitherLeftOf[T any](information string, value T) EitherLeft[T] { ... }
 * ```
 * Même forme que l'objet créé par `DEither.left(information, value)`.
 */
export const eitherLeftDependency = DCommon.memo(() => {
	const generic = GoAST.createIdentifier("T");
	const nullType = GoAST.createIdentifier("JSNull");
	const information = GoAST.createIdentifier("information");
	const value = GoAST.createIdentifier("value");
	const kind = (name: string) => `json:"@duplojs/lang/kind/@DuplojsLangEither/${name}"`;

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
			GoAST.createTypeDefinition({
				identifier: leftTypeIdentifier,
				generic: [typeParameter],
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Left"),
							typeReference: nullType,
							tag: kind("left"),
						}),
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Information"),
							typeReference: GoAST.builtinTypeReferences.string,
							tag: kind("information"),
						}),
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Value"),
							typeReference: generic,
							tag: kind("value"),
						}),
					],
				}),
			}),
			...createEitherMethods(leftTypeReference, false),
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

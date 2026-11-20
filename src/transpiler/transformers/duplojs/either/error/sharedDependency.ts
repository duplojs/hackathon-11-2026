import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";
import { createEitherMethods } from "../sharedDependency";

export const errorFunctionIdentifier = GoAST.createIdentifier("EitherErrorOf");
export const errorTypeIdentifier = GoAST.createIdentifier("EitherError");

export const eitherErrorDependency = DCommon.memo(() => {
	const generic = GoAST.createIdentifier("T");
	const nullType = GoAST.createIdentifier("JSNull");
	const value = GoAST.createIdentifier("value");
	const kind = (name: string) => `json:"@duplojs/lang/kind/@DuplojsLangEither/${name}"`;

	const typeParameter = GoAST.createTypeParameter({
		identifier: generic,
		constraint: GoAST.builtinTypeReferences.any,
	});

	const errorTypeReference = GoAST.createGenericTypeReference({
		typeReference: errorTypeIdentifier,
		typeArguments: DCommon.cast([generic]),
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeDefinition({
				identifier: errorTypeIdentifier,
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
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Error"),
							typeReference: nullType,
							tag: kind("error"),
						}),
					],
				}),
			}),
			...createEitherMethods(errorTypeReference, false),
			GoAST.createFunctionDeclaration({
				identifier: errorFunctionIdentifier,
				generic: [typeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: value,
						type: generic,
					}),
				],
				returnTypes: [errorTypeReference],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference: errorTypeReference,
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
											value: GoAST.createStringLiteral({ value: "error" }),
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Value"),
											value,
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Error"),
											value: GoAST.createStructLiteral({
												typeReference: nullType,
												elements: [],
											}),
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

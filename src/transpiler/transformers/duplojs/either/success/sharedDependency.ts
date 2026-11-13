import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const successFunctionIdentifier = GoAST.createIdentifier("EitherSuccessOf");
export const successTypeIdentifier = GoAST.createIdentifier("EitherSuccess");

export const eitherSuccessDependency = DCommon.memo(() => {
	const generic = GoAST.createIdentifier("T");
	const nullType = GoAST.createIdentifier("JSNull");

	const successTypeParameter = GoAST.createTypeParameter({
		identifier: generic,
		constraint: GoAST.builtinTypeReferences.any,
	});

	const successTypeReference = GoAST.createGenericTypeReference({
		typeReference: successTypeIdentifier,
		typeArguments: DCommon.cast([generic]),
	});

	const nullLiteral = GoAST.createStructLiteral({
		typeReference: nullType,
		elements: [],
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeAlias({
				identifier: successTypeIdentifier,
				generic: [successTypeParameter],
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Right"),
							typeReference: nullType,
							tag: "json:\"@duplojs/lang/kind/@DuplojsLangEither/right\"",
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
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Success"),
							typeReference: nullType,
							tag: "json:\"@duplojs/lang/kind/@DuplojsLangEither/success\"",
						}),
					],
				}),
			}),
			GoAST.createFunctionDeclaration({
				identifier: successFunctionIdentifier,
				generic: [successTypeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: GoAST.createIdentifier("value"),
						type: generic,
					}),
				],
				returnTypes: [successTypeReference],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference: successTypeReference,
									elements: [
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Right"),
											value: nullLiteral,
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Information"),
											value: GoAST.createStringLiteral({ value: "success" }),
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Value"),
											value: GoAST.createIdentifier("value"),
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Success"),
											value: nullLiteral,
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

import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const failTypeIdentifier = GoAST.createIdentifier("EitherFail");
export const failFunctionIdentifier = GoAST.createIdentifier("EitherFailOf");

export const eitherFailDependency = DCommon.memo(() => {
	const nullType = GoAST.createIdentifier("JSNull");
	const undefinedType = GoAST.createIdentifier("JSUndefined");
	const nullLiteral = GoAST.createStructLiteral({
		typeReference: nullType,
		elements: [],
	});
	const undefinedLiteral = GoAST.createStructLiteral({
		typeReference: undefinedType,
		elements: [],
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			// `Fail` ne porte pas de valeur : seule l'information occupe de la mémoire (16 octets).
			GoAST.createTypeAlias({
				identifier: failTypeIdentifier,
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Left"),
							typeReference: nullType,
							tag: "json:\"@duplojs/lang/kind/@DuplojsLangEither/left\"",
						}),
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Fail"),
							typeReference: nullType,
							tag: "json:\"@duplojs/lang/kind/@DuplojsLangEither/fail\"",
						}),
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Value"),
							typeReference: undefinedType,
							tag: "json:\"@duplojs/lang/kind/@DuplojsLangEither/value\"",
						}),
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Information"),
							typeReference: GoAST.builtinTypeReferences.string,
							tag: "json:\"@duplojs/lang/kind/@DuplojsLangEither/information\"",
						}),
					],
				}),
			}),
			GoAST.createFunctionDeclaration({
				identifier: failFunctionIdentifier,
				generic: [],
				arguments: [],
				returnTypes: [failTypeIdentifier],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference: failTypeIdentifier,
									elements: [
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Left"),
											value: nullLiteral,
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Fail"),
											value: nullLiteral,
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Value"),
											value: undefinedLiteral,
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Information"),
											value: GoAST.createStringLiteral({ value: "fail" }),
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

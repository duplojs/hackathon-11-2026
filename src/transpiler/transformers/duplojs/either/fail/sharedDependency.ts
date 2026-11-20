import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";
import { createEitherMethods } from "../sharedDependency";

export const failFunctionIdentifier = GoAST.createIdentifier("EitherFailOf");
export const failTypeIdentifier = GoAST.createIdentifier("EitherFail");

/**
 * ```go
 * type EitherFail struct {
 *     Left        JSNull      `json:".../left"`
 *     Information string      `json:".../information"`
 *     Value       JSUndefined `json:".../value,omitzero"`
 *     Fail        JSNull      `json:".../fail"`
 * }
 * func (_ EitherFail) IsRight() bool { return false }
 * func EitherFailOf() EitherFail { ... }
 * ```
 * Même forme que l'objet créé par `DEither.fail()`. La valeur est `undefined` :
 * `omitzero` + `JSUndefined.IsZero()` l'omettent du JSON, comme `JSON.stringify`.
 */
export const eitherFailDependency = DCommon.memo(() => {
	const nullType = GoAST.createIdentifier("JSNull");
	const undefinedType = GoAST.createIdentifier("JSUndefined");
	const kind = (name: string) => `json:"@duplojs/lang/kind/@DuplojsLangEither/${name}"`;

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeDefinition({
				identifier: failTypeIdentifier,
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
							typeReference: undefinedType,
							tag: kind("value,omitzero"),
						}),
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Fail"),
							typeReference: nullType,
							tag: kind("fail"),
						}),
					],
				}),
			}),
			...createEitherMethods(failTypeIdentifier, false),
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
											value: GoAST.createStructLiteral({
												typeReference: nullType,
												elements: [],
											}),
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Information"),
											value: GoAST.createStringLiteral({ value: "fail" }),
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Value"),
											value: GoAST.createStructLiteral({
												typeReference: undefinedType,
												elements: [],
											}),
										}),
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Fail"),
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

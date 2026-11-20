import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";
import { createEitherMethods } from "../sharedDependency";

export const rightFunctionIdentifier = GoAST.createIdentifier("EitherRightOf");
export const rightTypeIdentifier = GoAST.createIdentifier("EitherRight");

export const eitherRightDependency = DCommon.memo(() => {
	const generic = GoAST.createIdentifier("T");
	const nullType = GoAST.createIdentifier("JSNull");
	const information = GoAST.createIdentifier("information");
	const value = GoAST.createIdentifier("value");
	const kind = (name: string) => `json:"@duplojs/lang/kind/@DuplojsLangEither/${name}"`;

	const typeParameter = GoAST.createTypeParameter({
		identifier: generic,
		constraint: GoAST.builtinTypeReferences.any,
	});

	const rightTypeReference = GoAST.createGenericTypeReference({
		typeReference: rightTypeIdentifier,
		typeArguments: DCommon.cast([generic]),
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeDefinition({
				identifier: rightTypeIdentifier,
				generic: [typeParameter],
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("Right"),
							typeReference: nullType,
							tag: kind("right"),
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
			...createEitherMethods(rightTypeReference, true),
			GoAST.createFunctionDeclaration({
				identifier: rightFunctionIdentifier,
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
				returnTypes: [rightTypeReference],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference: rightTypeReference,
									elements: [
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("Right"),
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

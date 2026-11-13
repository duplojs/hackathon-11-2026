import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const undefinedShardDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeDefinition({
				identifier: GoAST.createIdentifier("JSUndefined"),
				type: GoAST.createStructType({ fields: [] }),
			}),
			GoAST.createMethodDeclaration({
				identifier: GoAST.createIdentifier("MarshalJSON"),
				receiver: [
					GoAST.createIdentifier("_"),
					GoAST.createIdentifier("JSUndefined"),
				],
				generic: [],
				arguments: [],
				returnTypes: [
					GoAST.createSliceType({
						elementType: GoAST.builtinTypeReferences.byte,
					}),
					GoAST.builtinTypeReferences.error,
				],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createConversionExpression({
									typeReference: GoAST.createSliceType({
										elementType: GoAST.builtinTypeReferences.byte,
									}),
									operand: GoAST.createStringLiteral({ value: "null" }),
								}),
								GoAST.createNilLiteral({}),
							],
						}),
					],
				}),
			}),
			GoAST.createMethodDeclaration({
				identifier: GoAST.createIdentifier("IsZero"),
				receiver: [
					GoAST.createIdentifier("_"),
					GoAST.createIdentifier("JSUndefined"),
				],
				generic: [],
				arguments: [],
				returnTypes: [GoAST.builtinTypeReferences.bool],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [GoAST.createBooleanLiteral({ value: true })],
						}),
					],
				}),
			}),
		],
	}),
);

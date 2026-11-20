import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const tupleSharedDependency = DCommon.memo(() => {
	const declarations: GoAST.Declaration[] = [];
	const byteType = GoAST.createIdentifier("byte");
	const errorType = GoAST.createIdentifier("error");

	for (let count = 2; count <= 8; count++) {
		const typeParams: GoAST.TypeParameter[] = [];
		const fields: GoAST.StructField[] = [];
		const fnArgs: GoAST.FunctionArgument[] = [];
		const structElements: GoAST.KeyedElement<GoAST.Identifier>[] = [];
		const jsonElements: GoAST.Expression[] = [];

		const tupleName = `Tuple${count}`;
		const tupleIdentifier = GoAST.createIdentifier(tupleName);
		const tupleOfIdentifier = GoAST.createIdentifier(`Tuple${count}Of`);
		const receiverIdent = GoAST.createIdentifier("t");

		for (let index = 0; index < count; index++) {
			const typeIdent = GoAST.createIdentifier(`T${index}`);
			const valIdent = GoAST.createIdentifier(`V${index}`);
			const argIdent = GoAST.createIdentifier(`v${index}`);

			typeParams.push(
				GoAST.createTypeParameter({
					identifier: typeIdent,
					constraint: GoAST.builtinTypeReferences.any,
				}),
			);

			fields.push(
				GoAST.createStructField({
					identifier: valIdent,
					typeReference: typeIdent,
				}),
			);

			fnArgs.push(
				GoAST.createFunctionArgument({
					identifier: argIdent,
					type: typeIdent,
				}),
			);

			structElements.push(
				GoAST.createKeyedElement({
					key: valIdent,
					value: argIdent,
				}),
			);

			jsonElements.push(
				GoAST.createSelectorExpression({
					target: receiverIdent,
					identifier: valIdent,
				}),
			);
		}

		const genericTypeRef = GoAST.createGenericTypeReference({
			typeReference: tupleIdentifier,
			typeArguments: typeParams.map((param) => param.identifier) as never,
		});

		// 1. Type definition
		declarations.push(
			GoAST.createTypeDefinition({
				identifier: tupleIdentifier,
				generic: typeParams,
				type: GoAST.createStructType({
					fields,
				}),
			}),
		);

		// 2. MarshalJSON method
		declarations.push(
			GoAST.createMethodDeclaration({
				identifier: GoAST.createIdentifier("MarshalJSON"),
				receiver: [receiverIdent, genericTypeRef],
				generic: [],
				arguments: [],
				returnTypes: [
					GoAST.createSliceType({ elementType: byteType }),
					errorType,
				],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createCallExpression({
									callee: GoAST.createSelectorExpression({
										target: GoAST.createIdentifier("json"),
										identifier: GoAST.createIdentifier("Marshal"),
									}),
									arguments: [
										GoAST.createSliceLiteral({
											typeReference: GoAST.createSliceType({
												elementType: GoAST.builtinTypeReferences.any,
											}),
											elements: jsonElements,
										}),
									],
								}),
							],
						}),
					],
				}),
			}),
		);

		// 3. Constructor function
		declarations.push(
			GoAST.createFunctionDeclaration({
				identifier: tupleOfIdentifier,
				generic: typeParams,
				arguments: fnArgs,
				returnTypes: [genericTypeRef],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference: genericTypeRef,
									elements: structElements,
								}),
							],
						}),
					],
				}),
			}),
		);
	}

	return createSharedDependency({
		imports: [
			GoAST.createImportDeclaration({ path: "encoding/json" }),
		],
		init: [],
		declarations,
	});
});

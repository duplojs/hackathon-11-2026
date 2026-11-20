import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const arrayMapIdentifier = GoAST.createIdentifier("ArrayMap");
export const arrayMapWithIdentifier = GoAST.createIdentifier("ArrayMapWith");

// `DArray.map` : la sortie est allouée une fois à la longueur de l'entrée et remplie dans
// l'ordre des éléments, ce qui conserve l'ordre et la longueur du tableau source.
export const arrayMapDependency = DCommon.memo(() => {
	const inputGeneric = GoAST.createIdentifier("T");
	const outputGeneric = GoAST.createIdentifier("U");
	const array = GoAST.createIdentifier("array");
	const theFunction = GoAST.createIdentifier("theFunction");
	const output = GoAST.createIdentifier("output");
	const index = GoAST.createIdentifier("index");
	const element = GoAST.createIdentifier("element");

	const typeParameters = [
		GoAST.createTypeParameter({
			identifier: inputGeneric,
			constraint: GoAST.builtinTypeReferences.any,
		}),
		GoAST.createTypeParameter({
			identifier: outputGeneric,
			constraint: GoAST.builtinTypeReferences.any,
		}),
	];

	const inputSlice = GoAST.createSliceType({ elementType: inputGeneric });
	const outputSlice = GoAST.createSliceType({ elementType: outputGeneric });
	const functionType = GoAST.createFunctionType({
		arguments: [
			GoAST.createFunctionArgument({
				identifier: GoAST.createIdentifier("_"),
				type: inputGeneric,
			}),
		],
		returnTypes: [outputGeneric],
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: arrayMapIdentifier,
				generic: typeParameters,
				arguments: [
					GoAST.createFunctionArgument({
						identifier: array,
						type: inputSlice,
					}),
					GoAST.createFunctionArgument({
						identifier: theFunction,
						type: functionType,
					}),
				],
				returnTypes: [outputSlice],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createShortVariableDeclarationStatement({
							identifier: output,
							initializer: GoAST.createCallExpression({
								callee: GoAST.createIdentifier("make"),
								typeArgument: outputSlice,
								arguments: [
									GoAST.createCallExpression({
										callee: GoAST.createIdentifier("len"),
										arguments: [array],
									}),
								],
							}),
						}),
						GoAST.createRangeStatement({
							binding: GoAST.createRangeDeclaration({
								key: index,
								value: element,
							}),
							expression: array,
							body: GoAST.createBlockStatement({
								statements: [
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([
											GoAST.createIndexExpression({
												target: output,
												index,
											}),
										]),
										values: DCommon.cast([
											GoAST.createCallExpression({
												callee: theFunction,
												arguments: [element],
											}),
										]),
									}),
								],
							}),
						}),
						GoAST.createReturnStatement({ values: [output] }),
					],
				}),
			}),
			// Forme curryfiée `DArray.map(theFunction)` : renvoie la fonction qui attend le tableau.
			GoAST.createFunctionDeclaration({
				identifier: arrayMapWithIdentifier,
				generic: typeParameters,
				arguments: [
					GoAST.createFunctionArgument({
						identifier: theFunction,
						type: functionType,
					}),
				],
				returnTypes: [
					GoAST.createFunctionType({
						arguments: [
							GoAST.createFunctionArgument({
								identifier: GoAST.createIdentifier("_"),
								type: inputSlice,
							}),
						],
						returnTypes: [outputSlice],
					}),
				],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createFunctionLiteral({
									arguments: [
										GoAST.createFunctionArgument({
											identifier: array,
											type: inputSlice,
										}),
									],
									returnTypes: [outputSlice],
									body: GoAST.createBlockStatement({
										statements: [
											GoAST.createReturnStatement({
												values: [
													GoAST.createCallExpression({
														callee: arrayMapIdentifier,
														arguments: [array, theFunction],
													}),
												],
											}),
										],
									}),
								}),
							],
						}),
					],
				}),
			}),
		],
	});
});

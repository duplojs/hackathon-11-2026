import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const arrayMapFunctionIdentifier = GoAST.createIdentifier("ArrayMap");
export const arrayMapIndexFunctionIdentifier = GoAST.createIdentifier("ArrayMapIndex");

export const arrayMapDependency = DCommon.memo(() => {
	const tGeneric = GoAST.createIdentifier("T");
	const rGeneric = GoAST.createIdentifier("R");
	const items = GoAST.createIdentifier("items");
	const fn = GoAST.createIdentifier("fn");
	const result = GoAST.createIdentifier("result");
	const indexIdent = GoAST.createIdentifier("i");
	const item = GoAST.createIdentifier("item");

	const tTypeParameter = GoAST.createTypeParameter({
		identifier: tGeneric,
		constraint: GoAST.builtinTypeReferences.any,
	});
	const rTypeParameter = GoAST.createTypeParameter({
		identifier: rGeneric,
		constraint: GoAST.builtinTypeReferences.any,
	});

	const indexStructType = GoAST.createStructType({
		fields: [
			GoAST.createStructField({
				identifier: GoAST.createIdentifier("Index"),
				typeReference: GoAST.builtinTypeReferences.float64,
			}),
		],
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: arrayMapFunctionIdentifier,
				generic: [tTypeParameter, rTypeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: items,
						type: GoAST.createSliceType({ elementType: tGeneric }),
					}),
					GoAST.createFunctionArgument({
						identifier: fn,
						type: GoAST.createFunctionType({
							arguments: [
								GoAST.createFunctionArgument({
									identifier: GoAST.createIdentifier("_"),
									type: tGeneric,
								}),
							],
							returnTypes: [rGeneric],
						}),
					}),
				],
				returnTypes: [GoAST.createSliceType({ elementType: rGeneric })],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createShortVariableDeclarationStatement({
							identifier: result,
							initializer: GoAST.createCallExpression({
								callee: GoAST.createIdentifier("make"),
								typeArgument: GoAST.createSliceType({ elementType: rGeneric }),
								arguments: [
									GoAST.createCallExpression({
										callee: GoAST.createIdentifier("len"),
										arguments: [items],
									}),
								],
							}),
						}),
						GoAST.createRangeStatement({
							binding: GoAST.createRangeDeclaration({
								key: indexIdent,
								value: item,
							}),
							expression: items,
							body: GoAST.createBlockStatement({
								statements: [
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([
											GoAST.createIndexExpression({
												target: result,
												index: indexIdent,
											}),
										]),
										values: DCommon.cast([
											GoAST.createCallExpression({
												callee: fn,
												arguments: [item],
											}),
										]),
									}),
								],
							}),
						}),
						GoAST.createReturnStatement({
							values: DCommon.cast([result]),
						}),
					],
				}),
			}),
			GoAST.createFunctionDeclaration({
				identifier: arrayMapIndexFunctionIdentifier,
				generic: [tTypeParameter, rTypeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: items,
						type: GoAST.createSliceType({ elementType: tGeneric }),
					}),
					GoAST.createFunctionArgument({
						identifier: fn,
						type: GoAST.createFunctionType({
							arguments: [
								GoAST.createFunctionArgument({
									identifier: GoAST.createIdentifier("_"),
									type: tGeneric,
								}),
								GoAST.createFunctionArgument({
									identifier: GoAST.createIdentifier("_"),
									type: indexStructType,
								}),
							],
							returnTypes: [rGeneric],
						}),
					}),
				],
				returnTypes: [GoAST.createSliceType({ elementType: rGeneric })],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createShortVariableDeclarationStatement({
							identifier: result,
							initializer: GoAST.createCallExpression({
								callee: GoAST.createIdentifier("make"),
								typeArgument: GoAST.createSliceType({ elementType: rGeneric }),
								arguments: [
									GoAST.createCallExpression({
										callee: GoAST.createIdentifier("len"),
										arguments: [items],
									}),
								],
							}),
						}),
						GoAST.createRangeStatement({
							binding: GoAST.createRangeDeclaration({
								key: indexIdent,
								value: item,
							}),
							expression: items,
							body: GoAST.createBlockStatement({
								statements: [
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([
											GoAST.createIndexExpression({
												target: result,
												index: indexIdent,
											}),
										]),
										values: DCommon.cast([
											GoAST.createCallExpression({
												callee: fn,
												arguments: [
													item,
													GoAST.createStructLiteral({
														typeReference: indexStructType,
														elements: [
															GoAST.createKeyedElement({
																key: GoAST.createIdentifier("Index"),
																value: GoAST.createCallExpression({
																	callee: GoAST.builtinTypeReferences.float64,
																	arguments: [indexIdent],
																}),
															}),
														],
													}),
												],
											}),
										]),
									}),
								],
							}),
						}),
						GoAST.createReturnStatement({
							values: DCommon.cast([result]),
						}),
					],
				}),
			}),
		],
	});
});

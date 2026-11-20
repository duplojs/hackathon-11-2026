import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const stringIncludesIdentifier = GoAST.createIdentifier("StringIncludes");
export const stringLengthIdentifier = GoAST.createIdentifier("StringLength");

const string = GoAST.builtinTypeReferences.string;
const value = GoAST.createIdentifier("value");
const searchString = GoAST.createIdentifier("searchString");
const length = GoAST.createIdentifier("length");
const character = GoAST.createIdentifier("character");

// Opérations DuploJS sur les chaînes. Une chaîne Go est en UTF-8, une chaîne JavaScript en
// UTF-16 : la longueur compte donc les unités UTF-16 (un émoji compte pour 2), comme `.length`.
export const stringDependency = DCommon.memo(() => createSharedDependency({
	imports: [GoAST.createImportDeclaration({ path: "strings" })],
	init: [],
	declarations: [
		GoAST.createFunctionDeclaration({
			identifier: stringIncludesIdentifier,
			generic: [],
			arguments: [
				GoAST.createFunctionArgument({
					identifier: value,
					type: string,
				}),
				GoAST.createFunctionArgument({
					identifier: searchString,
					type: string,
				}),
			],
			returnTypes: [GoAST.builtinTypeReferences.bool],
			body: GoAST.createBlockStatement({
				statements: [
					GoAST.createReturnStatement({
						values: [
							GoAST.createCallExpression({
								callee: GoAST.createSelectorExpression({
									target: GoAST.createIdentifier("strings"),
									identifier: GoAST.createIdentifier("Contains"),
								}),
								arguments: [value, searchString],
							}),
						],
					}),
				],
			}),
		}),
		GoAST.createFunctionDeclaration({
			identifier: stringLengthIdentifier,
			generic: [],
			arguments: [
				GoAST.createFunctionArgument({
					identifier: value,
					type: string,
				}),
			],
			returnTypes: [GoAST.builtinTypeReferences.float64],
			body: GoAST.createBlockStatement({
				statements: [
					GoAST.createShortVariableDeclarationStatement({
						identifier: length,
						initializer: GoAST.createIntegerLiteral({ value: 0n }),
					}),
					GoAST.createRangeStatement({
						binding: GoAST.createRangeDeclaration({
							key: GoAST.createIdentifier("_"),
							value: character,
						}),
						expression: value,
						body: GoAST.createBlockStatement({
							statements: [
								GoAST.createAssignmentStatement({
									targets: DCommon.cast([length]),
									values: DCommon.cast([
										GoAST.createBinaryExpression({
											operator: "+",
											left: length,
											right: GoAST.createIntegerLiteral({ value: 1n }),
										}),
									]),
								}),
								GoAST.createIfStatement({
									condition: GoAST.createBinaryExpression({
										operator: ">",
										left: character,
										right: GoAST.createIntegerLiteral({ value: 0xFFFFn }),
									}),
									body: GoAST.createBlockStatement({
										statements: [
											GoAST.createAssignmentStatement({
												targets: DCommon.cast([length]),
												values: DCommon.cast([
													GoAST.createBinaryExpression({
														operator: "+",
														left: length,
														right: GoAST.createIntegerLiteral({ value: 1n }),
													}),
												]),
											}),
										],
									}),
								}),
							],
						}),
					}),
					GoAST.createReturnStatement({
						values: [
							GoAST.createConversionExpression({
								typeReference: GoAST.builtinTypeReferences.float64,
								operand: length,
							}),
						],
					}),
				],
			}),
		}),
	],
}));

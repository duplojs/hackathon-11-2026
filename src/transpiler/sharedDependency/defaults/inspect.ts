import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

// Formateur partagé reproduisant le format util.inspect de Node pour
// DCommon.print (voir docs/duplojs-semantics.md, Q2, et
// docs/decisions/ADR-1-either.md §7-8). Toute valeur affichable transite par
// l'interface Inspectable ci-dessous ; Either (Personne 4) l'implémentera en
// exposant ses champs via InspectEntries.

export const printFunctionIdentifier = GoAST.createIdentifier("Print");
export const jsNumberToStringFunctionIdentifier = GoAST.createIdentifier("JSNumberToString");
export const inspectEntryTypeIdentifier = GoAST.createIdentifier("InspectEntry");
export const inspectableTypeIdentifier = GoAST.createIdentifier("Inspectable");

export const inspectSharedDependency = DCommon.memo(() => {
	const genericT = GoAST.createIdentifier("T");
	const valueParam = GoAST.createIdentifier("value");
	const depthParam = GoAST.createIdentifier("depth");
	const typedBinding = GoAST.createIdentifier("typed");
	const textBinding = GoAST.createIdentifier("text");
	const partsVariable = GoAST.createIdentifier("parts");
	const elementBinding = GoAST.createIdentifier("element");
	const entryBinding = GoAST.createIdentifier("entry");
	const indexVariable = GoAST.createIdentifier("index");
	const keyParam = GoAST.createIdentifier("key");
	const characterParam = GoAST.createIdentifier("character");
	const openBraceParam = GoAST.createIdentifier("openBrace");
	const closeBraceParam = GoAST.createIdentifier("closeBrace");
	const indentationLevelVariable = GoAST.createIdentifier("indentationLevel");
	const indentationVariable = GoAST.createIdentifier("indentation");
	const startParam = GoAST.createIdentifier("start");
	const totalLengthVariable = GoAST.createIdentifier("totalLength");
	const partParam = GoAST.createIdentifier("part");
	const formattedVariable = GoAST.createIdentifier("formatted");
	const cutIndexVariable = GoAST.createIdentifier("cutIndex");
	const mantissaVariable = GoAST.createIdentifier("mantissa");
	const exponentSignVariable = GoAST.createIdentifier("exponentSign");
	const exponentDigitsVariable = GoAST.createIdentifier("exponentDigits");
	const absoluteVariable = GoAST.createIdentifier("absolute");

	const inspectBreakLengthIdentifier = GoAST.createIdentifier("inspectBreakLength");
	const inspectValueIdentifier = GoAST.createIdentifier("inspectValue");
	const inspectTopLevelIdentifier = GoAST.createIdentifier("inspectTopLevel");
	const inspectObjectIdentifier = GoAST.createIdentifier("inspectObject");
	const inspectKeyIdentifier = GoAST.createIdentifier("inspectKey");
	const inspectIsIdentifierKeyIdentifier = GoAST.createIdentifier("inspectIsIdentifierKey");
	const inspectIsIdentifierStartIdentifier = GoAST.createIdentifier("inspectIsIdentifierStart");
	const inspectIsIdentifierPartIdentifier = GoAST.createIdentifier("inspectIsIdentifierPart");
	const inspectReduceToSingleStringIdentifier = GoAST.createIdentifier("inspectReduceToSingleString");
	const inspectIsBelowBreakLengthIdentifier = GoAST.createIdentifier("inspectIsBelowBreakLength");

	const fmtIdentifier = GoAST.createIdentifier("fmt");
	const mathIdentifier = GoAST.createIdentifier("math");
	const strconvIdentifier = GoAST.createIdentifier("strconv");
	const stringsIdentifier = GoAST.createIdentifier("strings");

	const jsNullType = GoAST.createIdentifier("JSNull");
	const jsUndefinedType = GoAST.createIdentifier("JSUndefined");

	const sliceOfString = GoAST.createSliceType({ elementType: GoAST.builtinTypeReferences.string });
	const sliceOfFloat64 = GoAST.createSliceType({ elementType: GoAST.builtinTypeReferences.float64 });

	const falseLiteral = GoAST.createBooleanLiteral({ value: false });
	const returnFalseStatements = [GoAST.createReturnStatement({ values: [falseLiteral] })];

	function plus(left: GoAST.Expression, right: GoAST.Expression) {
		return GoAST.createBinaryExpression({
			operator: "+",
			left,
			right,
		});
	}

	function concat(...parts: readonly [GoAST.Expression, GoAST.Expression, ...GoAST.Expression[]]) {
		return parts.reduce((left, right) => plus(left, right));
	}

	function call(callee: GoAST.Expression, args: readonly GoAST.Expression[]) {
		return GoAST.createCallExpression({
			callee,
			arguments: args,
		});
	}

	function returnCallStatements(callee: GoAST.Expression, args: readonly GoAST.Expression[]) {
		return [GoAST.createReturnStatement({ values: [call(callee, args)] })];
	}

	function packageCall(packageName: GoAST.Identifier, functionName: string, args: readonly GoAST.Expression[]) {
		return call(
			GoAST.createSelectorExpression({
				target: packageName,
				identifier: GoAST.createIdentifier(functionName),
			}),
			args,
		);
	}

	const inspectBreakLengthDeclaration = GoAST.createConstantDeclaration({
		identifier: inspectBreakLengthIdentifier,
		initializer: GoAST.createIntegerLiteral({ value: 80n }),
	});

	const inspectEntryTypeDeclaration = GoAST.createTypeDefinition({
		identifier: inspectEntryTypeIdentifier,
		type: GoAST.createStructType({
			fields: [
				GoAST.createStructField({
					identifier: GoAST.createIdentifier("Key"),
					typeReference: GoAST.builtinTypeReferences.string,
				}),
				GoAST.createStructField({
					identifier: GoAST.createIdentifier("Value"),
					typeReference: GoAST.builtinTypeReferences.any,
				}),
			],
		}),
	});

	const inspectableTypeDeclaration = GoAST.createTypeDefinition({
		identifier: inspectableTypeIdentifier,
		type: GoAST.createInterfaceType({
			elements: [
				GoAST.createInterfaceMethod({
					identifier: GoAST.createIdentifier("InspectEntries"),
					arguments: [],
					returnTypes: [GoAST.createSliceType({ elementType: inspectEntryTypeIdentifier })],
				}),
			],
		}),
	});

	// JSNumberToString : seuils 1e-6/1e21 et notation exponentielle (`1.5e-7`
	// plutôt que le `1.5e-07` de Go), vérifiés en exécution dans
	// docs/duplojs-semantics.md (Q4) et sandbox/q4-string-to-format.ts.
	// strings.Cut (utilisé par le prototype research/either/inspect/inspect.go)
	// renvoie 3 valeurs ; l'AST Go du transpileur ne représente pas encore une
	// déclaration courte à affectations multiples (`a, b := f()`), donc cette
	// version découpe la chaîne avec strings.IndexByte (un seul retour) et des
	// expressions de slice Go plutôt qu'avec Cut.
	const jsNumberToStringDeclaration = GoAST.createFunctionDeclaration({
		identifier: jsNumberToStringFunctionIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: valueParam,
				type: GoAST.builtinTypeReferences.float64,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.string],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createExpressionSwitchStatementWithoutDefault({
					cases: [
						GoAST.createExpressionSwitchCase({
							expressions: DCommon.cast([packageCall(mathIdentifier, "IsNaN", [valueParam])]),
							statements: [GoAST.createReturnStatement({ values: [GoAST.createStringLiteral({ value: "NaN" })] })],
						}),
						GoAST.createExpressionSwitchCase({
							expressions: DCommon.cast([packageCall(mathIdentifier, "IsInf", [valueParam, GoAST.createIntegerLiteral({ value: 1n })])]),
							statements: [GoAST.createReturnStatement({ values: [GoAST.createStringLiteral({ value: "Infinity" })] })],
						}),
						GoAST.createExpressionSwitchCase({
							expressions: DCommon.cast([
								packageCall(mathIdentifier, "IsInf", [
									valueParam,
									GoAST.createUnaryExpression({
										operator: "-",
										operand: GoAST.createIntegerLiteral({ value: 1n }),
									}),
								]),
							]),
							statements: [GoAST.createReturnStatement({ values: [GoAST.createStringLiteral({ value: "-Infinity" })] })],
						}),
						GoAST.createExpressionSwitchCase({
							expressions: DCommon.cast([
								GoAST.createBinaryExpression({
									operator: "==",
									left: valueParam,
									right: GoAST.createFloatLiteral({ value: "0" }),
								}),
							]),
							statements: [GoAST.createReturnStatement({ values: [GoAST.createStringLiteral({ value: "0" })] })],
						}),
					],
				}),
				GoAST.createShortVariableDeclarationStatement({
					identifier: absoluteVariable,
					initializer: packageCall(mathIdentifier, "Abs", [valueParam]),
				}),
				GoAST.createIfStatement({
					condition: GoAST.createBinaryExpression({
						operator: "&&",
						left: GoAST.createBinaryExpression({
							operator: ">=",
							left: absoluteVariable,
							right: GoAST.createFloatLiteral({ value: "1e-6" }),
						}),
						right: GoAST.createBinaryExpression({
							operator: "<",
							left: absoluteVariable,
							right: GoAST.createFloatLiteral({ value: "1e21" }),
						}),
					}),
					body: GoAST.createBlockStatement({
						statements: [
							GoAST.createReturnStatement({
								values: [
									packageCall(strconvIdentifier, "FormatFloat", [
										valueParam,
										GoAST.createRuneLiteral({ value: "f" }),
										GoAST.createUnaryExpression({
											operator: "-",
											operand: GoAST.createIntegerLiteral({ value: 1n }),
										}),
										GoAST.createIntegerLiteral({ value: 64n }),
									]),
								],
							}),
						],
					}),
				}),
				GoAST.createShortVariableDeclarationStatement({
					identifier: formattedVariable,
					initializer: packageCall(strconvIdentifier, "FormatFloat", [
						valueParam,
						GoAST.createRuneLiteral({ value: "e" }),
						GoAST.createUnaryExpression({
							operator: "-",
							operand: GoAST.createIntegerLiteral({ value: 1n }),
						}),
						GoAST.createIntegerLiteral({ value: 64n }),
					]),
				}),
				GoAST.createShortVariableDeclarationStatement({
					identifier: cutIndexVariable,
					initializer: packageCall(stringsIdentifier, "IndexByte", [
						formattedVariable,
						GoAST.createRuneLiteral({ value: "e" }),
					]),
				}),
				GoAST.createShortVariableDeclarationStatement({
					identifier: mantissaVariable,
					initializer: GoAST.createSliceExpression({
						target: formattedVariable,
						high: cutIndexVariable,
					}),
				}),
				GoAST.createShortVariableDeclarationStatement({
					identifier: exponentSignVariable,
					initializer: GoAST.createSliceExpression({
						target: formattedVariable,
						low: plus(cutIndexVariable, GoAST.createIntegerLiteral({ value: 1n })),
						high: plus(cutIndexVariable, GoAST.createIntegerLiteral({ value: 2n })),
					}),
				}),
				GoAST.createShortVariableDeclarationStatement({
					identifier: exponentDigitsVariable,
					initializer: packageCall(stringsIdentifier, "TrimLeft", [
						GoAST.createSliceExpression({
							target: formattedVariable,
							low: plus(cutIndexVariable, GoAST.createIntegerLiteral({ value: 2n })),
						}),
						GoAST.createStringLiteral({ value: "0" }),
					]),
				}),
				GoAST.createReturnStatement({
					values: [
						concat(
							mantissaVariable,
							GoAST.createStringLiteral({ value: "e" }),
							exponentSignVariable,
							exponentDigitsVariable,
						),
					],
				}),
			],
		}),
	});

	// inspectIsIdentifierKey/Start/Part : une clé d'objet s'affiche nue
	// uniquement si c'est un identifiant JS valide ; sinon entre quotes
	// simples. Les clés DuploJS (`@duplojs/lang/kind/...`) ne le sont jamais,
	// mais la règle est générale (voir docs/duplojs-semantics.md, Q2).
	const inspectIsIdentifierStartDeclaration = GoAST.createFunctionDeclaration({
		identifier: inspectIsIdentifierStartIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: characterParam,
				type: GoAST.builtinTypeReferences.byte,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.bool],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createReturnStatement({
					values: [
						GoAST.createBinaryExpression({
							operator: "||",
							left: GoAST.createBinaryExpression({
								operator: "==",
								left: characterParam,
								right: GoAST.createRuneLiteral({ value: "_" }),
							}),
							right: GoAST.createBinaryExpression({
								operator: "||",
								left: GoAST.createBinaryExpression({
									operator: "==",
									left: characterParam,
									right: GoAST.createRuneLiteral({ value: "$" }),
								}),
								right: GoAST.createBinaryExpression({
									operator: "||",
									left: GoAST.createBinaryExpression({
										operator: "&&",
										left: GoAST.createBinaryExpression({
											operator: ">=",
											left: characterParam,
											right: GoAST.createRuneLiteral({ value: "a" }),
										}),
										right: GoAST.createBinaryExpression({
											operator: "<=",
											left: characterParam,
											right: GoAST.createRuneLiteral({ value: "z" }),
										}),
									}),
									right: GoAST.createBinaryExpression({
										operator: "&&",
										left: GoAST.createBinaryExpression({
											operator: ">=",
											left: characterParam,
											right: GoAST.createRuneLiteral({ value: "A" }),
										}),
										right: GoAST.createBinaryExpression({
											operator: "<=",
											left: characterParam,
											right: GoAST.createRuneLiteral({ value: "Z" }),
										}),
									}),
								}),
							}),
						}),
					],
				}),
			],
		}),
	});

	const inspectIsIdentifierPartDeclaration = GoAST.createFunctionDeclaration({
		identifier: inspectIsIdentifierPartIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: characterParam,
				type: GoAST.builtinTypeReferences.byte,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.bool],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createReturnStatement({
					values: [
						GoAST.createBinaryExpression({
							operator: "||",
							left: call(inspectIsIdentifierStartIdentifier, [characterParam]),
							right: GoAST.createBinaryExpression({
								operator: "&&",
								left: GoAST.createBinaryExpression({
									operator: ">=",
									left: characterParam,
									right: GoAST.createRuneLiteral({ value: "0" }),
								}),
								right: GoAST.createBinaryExpression({
									operator: "<=",
									left: characterParam,
									right: GoAST.createRuneLiteral({ value: "9" }),
								}),
							}),
						}),
					],
				}),
			],
		}),
	});

	const inspectIsIdentifierKeyDeclaration = GoAST.createFunctionDeclaration({
		identifier: inspectIsIdentifierKeyIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: keyParam,
				type: GoAST.builtinTypeReferences.string,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.bool],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createIfStatement({
					condition: GoAST.createBinaryExpression({
						operator: "==",
						left: call(GoAST.createIdentifier("len"), [keyParam]),
						right: GoAST.createIntegerLiteral({ value: 0n }),
					}),
					body: GoAST.createBlockStatement({
						statements: returnFalseStatements,
					}),
				}),
				GoAST.createForStatement({
					initializer: GoAST.createShortVariableDeclarationStatement({
						identifier: indexVariable,
						initializer: GoAST.createIntegerLiteral({ value: 0n }),
					}),
					condition: GoAST.createBinaryExpression({
						operator: "<",
						left: indexVariable,
						right: call(GoAST.createIdentifier("len"), [keyParam]),
					}),
					post: GoAST.createCompoundAssignmentStatement({
						operator: "+=",
						target: indexVariable,
						value: GoAST.createIntegerLiteral({ value: 1n }),
					}),
					body: GoAST.createBlockStatement({
						statements: [
							GoAST.createShortVariableDeclarationStatement({
								identifier: characterParam,
								initializer: GoAST.createIndexExpression({
									target: keyParam,
									index: indexVariable,
								}),
							}),
							GoAST.createIfStatement({
								condition: GoAST.createBinaryExpression({
									operator: "==",
									left: indexVariable,
									right: GoAST.createIntegerLiteral({ value: 0n }),
								}),
								body: GoAST.createBlockStatement({
									statements: [
										GoAST.createIfStatement({
											condition: GoAST.createUnaryExpression({
												operator: "!",
												operand: call(inspectIsIdentifierStartIdentifier, [characterParam]),
											}),
											body: GoAST.createBlockStatement({
												statements: returnFalseStatements,
											}),
										}),
									],
								}),
								elseBranch: GoAST.createIfStatement({
									condition: GoAST.createUnaryExpression({
										operator: "!",
										operand: call(inspectIsIdentifierPartIdentifier, [characterParam]),
									}),
									body: GoAST.createBlockStatement({
										statements: returnFalseStatements,
									}),
								}),
							}),
						],
					}),
				}),
				GoAST.createReturnStatement({ values: [GoAST.createBooleanLiteral({ value: true })] }),
			],
		}),
	});

	const inspectKeyDeclaration = GoAST.createFunctionDeclaration({
		identifier: inspectKeyIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: keyParam,
				type: GoAST.builtinTypeReferences.string,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.string],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createIfStatement({
					condition: call(inspectIsIdentifierKeyIdentifier, [keyParam]),
					body: GoAST.createBlockStatement({
						statements: [GoAST.createReturnStatement({ values: [keyParam] })],
					}),
				}),
				GoAST.createReturnStatement({
					values: [
						concat(
							GoAST.createStringLiteral({ value: "'" }),
							keyParam,
							GoAST.createStringLiteral({ value: "'" }),
						),
					],
				}),
			],
		}),
	});

	// inspectIsBelowBreakLength / inspectReduceToSingleString : reproduction
	// de la fonction reduceToSingleString de util.inspect (Node), lue dans
	// lib/internal/util/inspect.js et recalibrée empiriquement (voir le
	// résumé des mesures dans docs/duplojs-semantics.md). breakLength = 80,
	// base = "" (jamais de préfixe de classe ici). Non couvert : le
	// regroupement en colonnes des tableaux de plus de 6 éléments
	// (`groupArrayElements`), et le garde-fou de profondeur `compact`
	// au-delà de 2 niveaux d'imbrication (nos données ne dépassent pas 2
	// niveaux dans les exercices 01 à 10).
	const inspectIsBelowBreakLengthDeclaration = GoAST.createFunctionDeclaration({
		identifier: inspectIsBelowBreakLengthIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: partsVariable,
				type: sliceOfString,
			}),
			GoAST.createFunctionArgument({
				identifier: startParam,
				type: GoAST.builtinTypeReferences.int,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.bool],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createShortVariableDeclarationStatement({
					identifier: totalLengthVariable,
					initializer: plus(call(GoAST.createIdentifier("len"), [partsVariable]), startParam),
				}),
				GoAST.createIfStatement({
					condition: GoAST.createBinaryExpression({
						operator: ">",
						left: plus(totalLengthVariable, call(GoAST.createIdentifier("len"), [partsVariable])),
						right: inspectBreakLengthIdentifier,
					}),
					body: GoAST.createBlockStatement({
						statements: returnFalseStatements,
					}),
				}),
				GoAST.createRangeStatement({
					binding: GoAST.createRangeDeclaration({
						key: GoAST.createIdentifier("_"),
						value: partParam,
					}),
					expression: partsVariable,
					body: GoAST.createBlockStatement({
						statements: [
							GoAST.createIfStatement({
								condition: packageCall(stringsIdentifier, "Contains", [
									partParam,
									GoAST.createStringLiteral({ value: "\n" }),
								]),
								body: GoAST.createBlockStatement({
									statements: returnFalseStatements,
								}),
							}),
							GoAST.createCompoundAssignmentStatement({
								operator: "+=",
								target: totalLengthVariable,
								value: call(GoAST.createIdentifier("len"), [partParam]),
							}),
							GoAST.createIfStatement({
								condition: GoAST.createBinaryExpression({
									operator: ">",
									left: totalLengthVariable,
									right: inspectBreakLengthIdentifier,
								}),
								body: GoAST.createBlockStatement({
									statements: returnFalseStatements,
								}),
							}),
						],
					}),
				}),
				GoAST.createReturnStatement({ values: [GoAST.createBooleanLiteral({ value: true })] }),
			],
		}),
	});

	const inspectReduceToSingleStringDeclaration = GoAST.createFunctionDeclaration({
		identifier: inspectReduceToSingleStringIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: partsVariable,
				type: sliceOfString,
			}),
			GoAST.createFunctionArgument({
				identifier: openBraceParam,
				type: GoAST.builtinTypeReferences.string,
			}),
			GoAST.createFunctionArgument({
				identifier: closeBraceParam,
				type: GoAST.builtinTypeReferences.string,
			}),
			GoAST.createFunctionArgument({
				identifier: depthParam,
				type: GoAST.builtinTypeReferences.int,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.string],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createIfStatement({
					condition: GoAST.createBinaryExpression({
						operator: "==",
						left: call(GoAST.createIdentifier("len"), [partsVariable]),
						right: GoAST.createIntegerLiteral({ value: 0n }),
					}),
					body: GoAST.createBlockStatement({
						statements: [GoAST.createReturnStatement({ values: [plus(openBraceParam, closeBraceParam)] })],
					}),
				}),
				GoAST.createShortVariableDeclarationStatement({
					identifier: indentationLevelVariable,
					initializer: GoAST.createBinaryExpression({
						operator: "*",
						left: depthParam,
						right: GoAST.createIntegerLiteral({ value: 2n }),
					}),
				}),
				GoAST.createIfStatement({
					condition: call(inspectIsBelowBreakLengthIdentifier, [
						partsVariable,
						plus(
							plus(indentationLevelVariable, call(GoAST.createIdentifier("len"), [openBraceParam])),
							GoAST.createIntegerLiteral({ value: 10n }),
						),
					]),
					body: GoAST.createBlockStatement({
						statements: [
							GoAST.createReturnStatement({
								values: [
									concat(
										openBraceParam,
										GoAST.createStringLiteral({ value: " " }),
										packageCall(stringsIdentifier, "Join", [
											partsVariable,
											GoAST.createStringLiteral({ value: ", " }),
										]),
										GoAST.createStringLiteral({ value: " " }),
										closeBraceParam,
									),
								],
							}),
						],
					}),
				}),
				GoAST.createShortVariableDeclarationStatement({
					identifier: indentationVariable,
					initializer: concat(
						GoAST.createStringLiteral({ value: "\n" }),
						packageCall(stringsIdentifier, "Repeat", [
							GoAST.createStringLiteral({ value: " " }),
							indentationLevelVariable,
						]),
					),
				}),
				GoAST.createReturnStatement({
					values: [
						concat(
							openBraceParam,
							indentationVariable,
							GoAST.createStringLiteral({ value: "  " }),
							packageCall(stringsIdentifier, "Join", [
								partsVariable,
								concat(
									GoAST.createStringLiteral({ value: "," }),
									indentationVariable,
									GoAST.createStringLiteral({ value: "  " }),
								),
							]),
							indentationVariable,
							closeBraceParam,
						),
					],
				}),
			],
		}),
	});

	const inspectObjectDeclaration = GoAST.createFunctionDeclaration({
		identifier: inspectObjectIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: valueParam,
				type: inspectableTypeIdentifier,
			}),
			GoAST.createFunctionArgument({
				identifier: depthParam,
				type: GoAST.builtinTypeReferences.int,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.string],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createShortVariableDeclarationStatement({
					identifier: GoAST.createIdentifier("entries"),
					initializer: call(
						GoAST.createSelectorExpression({
							target: valueParam,
							identifier: GoAST.createIdentifier("InspectEntries"),
						}),
						[],
					),
				}),
				GoAST.createShortVariableDeclarationStatement({
					identifier: partsVariable,
					initializer: GoAST.createSliceLiteral({
						typeReference: sliceOfString,
						elements: [],
					}),
				}),
				GoAST.createRangeStatement({
					binding: GoAST.createRangeDeclaration({
						key: GoAST.createIdentifier("_"),
						value: entryBinding,
					}),
					expression: GoAST.createIdentifier("entries"),
					body: GoAST.createBlockStatement({
						statements: [
							GoAST.createAssignmentStatement({
								targets: DCommon.cast([partsVariable]),
								values: DCommon.cast([
									call(GoAST.createIdentifier("append"), [
										partsVariable,
										concat(
											call(inspectKeyIdentifier, [
												GoAST.createSelectorExpression({
													target: entryBinding,
													identifier: GoAST.createIdentifier("Key"),
												}),
											]),
											GoAST.createStringLiteral({ value: ": " }),
											call(inspectValueIdentifier, [
												GoAST.createSelectorExpression({
													target: entryBinding,
													identifier: GoAST.createIdentifier("Value"),
												}),
												plus(depthParam, GoAST.createIntegerLiteral({ value: 1n })),
											]),
										),
									]),
								]),
							}),
						],
					}),
				}),
				GoAST.createReturnStatement({
					values: [
						call(inspectReduceToSingleStringIdentifier, [
							partsVariable,
							GoAST.createStringLiteral({ value: "{" }),
							GoAST.createStringLiteral({ value: "}" }),
							depthParam,
						]),
					],
				}),
			],
		}),
	});

	function sliceInspectCase(sliceType: GoAST.SliceType) {
		return GoAST.createTypeSwitchCase({
			types: DCommon.cast([sliceType]),
			statements: [
				GoAST.createShortVariableDeclarationStatement({
					identifier: partsVariable,
					initializer: GoAST.createSliceLiteral({
						typeReference: sliceOfString,
						elements: [],
					}),
				}),
				GoAST.createRangeStatement({
					binding: GoAST.createRangeDeclaration({
						key: GoAST.createIdentifier("_"),
						value: elementBinding,
					}),
					expression: typedBinding,
					body: GoAST.createBlockStatement({
						statements: [
							GoAST.createAssignmentStatement({
								targets: DCommon.cast([partsVariable]),
								values: DCommon.cast([
									call(GoAST.createIdentifier("append"), [
										partsVariable,
										// Go convertit implicitement l'élément concret (float64 ou
										// string) vers le paramètre `any` d'inspectValue.
										call(inspectValueIdentifier, [
											elementBinding,
											plus(depthParam, GoAST.createIntegerLiteral({ value: 1n })),
										]),
									]),
								]),
							}),
						],
					}),
				}),
				GoAST.createReturnStatement({
					values: [
						call(inspectReduceToSingleStringIdentifier, [
							partsVariable,
							GoAST.createStringLiteral({ value: "[" }),
							GoAST.createStringLiteral({ value: "]" }),
							depthParam,
						]),
					],
				}),
			],
		});
	}

	// Forme Plain (ADR-2, contrat §8) : testée avant Inspectable, car un
	// Either[V] implémente les deux. L'AST ne représente pas `a, b := f()` :
	// on déclare les deux variables puis on les affecte (`a, b = f()`), et le
	// repli vers Inspectable passe par un switch de type plutôt que par une
	// assertion « comma ok ».
	const plainValueVariable = GoAST.createIdentifier("plainValue");
	const isPlainVariable = GoAST.createIdentifier("isPlain");
	const objectBinding = GoAST.createIdentifier("object");
	const unsupportedValuePanic = call(GoAST.createIdentifier("panic"), [GoAST.createStringLiteral({ value: "shard_dependencies: unsupported value passed to Print" })]);

	const inspectPlainCase = GoAST.createTypeSwitchCase({
		types: DCommon.cast([
			GoAST.createInterfaceType({
				elements: [
					GoAST.createInterfaceMethod({
						identifier: GoAST.createIdentifier("InspectPlain"),
						arguments: [],
						returnTypes: [GoAST.builtinTypeReferences.any, GoAST.builtinTypeReferences.bool],
					}),
				],
			}),
		]),
		statements: [
			GoAST.createVariableDeclarationZeroValue({
				identifier: plainValueVariable,
				typeReference: GoAST.builtinTypeReferences.any,
			}),
			GoAST.createVariableDeclarationZeroValue({
				identifier: isPlainVariable,
				typeReference: GoAST.builtinTypeReferences.bool,
			}),
			GoAST.createAssignmentStatement({
				targets: DCommon.cast([plainValueVariable, isPlainVariable]),
				values: DCommon.cast([
					call(
						GoAST.createSelectorExpression({
							target: typedBinding,
							identifier: GoAST.createIdentifier("InspectPlain"),
						}),
						[],
					),
				]),
			}),
			GoAST.createIfStatement({
				condition: isPlainVariable,
				body: GoAST.createBlockStatement({
					statements: returnCallStatements(inspectValueIdentifier, [plainValueVariable, depthParam]),
				}),
			}),
			GoAST.createTypeSwitchStatementWithoutDefault({
				expression: typedBinding,
				identifier: objectBinding,
				cases: [
					GoAST.createTypeSwitchCase({
						types: DCommon.cast([inspectableTypeIdentifier]),
						statements: returnCallStatements(inspectObjectIdentifier, [objectBinding, depthParam]),
					}),
				],
			}),
			unsupportedValuePanic,
		],
	});

	// ADR-13 : tout autre tableau ([]bool, [][]float64, slice d'Either ou d'unions…)
	// est parcouru par réflexion. Ce chemin ne sert qu'à l'affichage : les cas
	// []float64 et []string, plus fréquents, restent directs.
	const reflectedIdentifier = GoAST.createIdentifier("reflected");
	const indexIdentifier = GoAST.createIdentifier("index");
	const reflectIdentifier = GoAST.createIdentifier("reflect");
	const reflectedKindIs = (kind: string) => GoAST.createBinaryExpression({
		operator: "==",
		left: call(GoAST.createSelectorExpression({
			target: reflectedIdentifier,
			identifier: GoAST.createIdentifier("Kind"),
		}), []),
		right: GoAST.createSelectorExpression({
			target: reflectIdentifier,
			identifier: GoAST.createIdentifier(kind),
		}),
	});
	// ADR-14 : objet (struct anonyme). Clé : tag `js` ; champ optionnel absent
	// (valeur undefined) : non affiché, comme une propriété absente en JS.
	const isUndefinedIdentifier = GoAST.createIdentifier("inspectIsUndefined");
	const fieldIdentifier = GoAST.createIdentifier("field");
	const keyIdentifier = GoAST.createIdentifier("key");
	const optionalIdentifier = GoAST.createIdentifier("optional");
	const fieldValueIdentifier = GoAST.createIdentifier("fieldValue");
	const selectCall = (
		target: GoAST.Expression,
		name: string,
		args: readonly GoAST.Expression[] = [],
	) => call(GoAST.createSelectorExpression({
		target,
		identifier: GoAST.createIdentifier(name),
	}), args);
	const reflectedStructIf = GoAST.createIfStatement({
		condition: GoAST.createBinaryExpression({
			operator: "==",
			left: selectCall(GoAST.createIdentifier("reflected"), "Kind"),
			right: GoAST.createSelectorExpression({
				target: GoAST.createIdentifier("reflect"),
				identifier: GoAST.createIdentifier("Struct"),
			}),
		}),
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createShortVariableDeclarationStatement({
					identifier: partsVariable,
					initializer: GoAST.createSliceLiteral({
						typeReference: sliceOfString,
						elements: [],
					}),
				}),
				GoAST.createRangeStatement({
					binding: GoAST.createRangeDeclaration({ key: GoAST.createIdentifier("index") }),
					expression: selectCall(GoAST.createIdentifier("reflected"), "NumField"),
					body: GoAST.createBlockStatement({
						statements: [
							GoAST.createShortVariableDeclarationStatement({
								identifier: fieldIdentifier,
								initializer: selectCall(
									selectCall(GoAST.createIdentifier("reflected"), "Type"),
									"Field",
									[GoAST.createIdentifier("index")],
								),
							}),
							GoAST.createVariableDeclarationZeroValue({
								identifier: keyIdentifier,
								typeReference: GoAST.builtinTypeReferences.string,
							}),
							GoAST.createVariableDeclarationZeroValue({
								identifier: optionalIdentifier,
								typeReference: GoAST.builtinTypeReferences.bool,
							}),
							GoAST.createAssignmentStatement({
								targets: DCommon.cast([keyIdentifier, optionalIdentifier]),
								values: DCommon.cast([
									packageCall(stringsIdentifier, "CutSuffix", [
										selectCall(
											GoAST.createSelectorExpression({
												target: fieldIdentifier,
												identifier: GoAST.createIdentifier("Tag"),
											}),
											"Get",
											[GoAST.createStringLiteral({ value: "js" })],
										),
										GoAST.createStringLiteral({ value: ",optional" }),
									]),
								]),
							}),
							GoAST.createShortVariableDeclarationStatement({
								identifier: fieldValueIdentifier,
								initializer: selectCall(
									selectCall(GoAST.createIdentifier("reflected"), "Field", [GoAST.createIdentifier("index")]),
									"Interface",
								),
							}),
							GoAST.createIfStatement({
								condition: GoAST.createBinaryExpression({
									operator: "&&",
									left: optionalIdentifier,
									right: call(isUndefinedIdentifier, [fieldValueIdentifier]),
								}),
								body: GoAST.createBlockStatement({
									statements: [GoAST.createContinueStatement({})],
								}),
							}),
							GoAST.createAssignmentStatement({
								targets: DCommon.cast([partsVariable]),
								values: DCommon.cast([
									call(GoAST.createIdentifier("append"), [
										partsVariable,
										concat(
											call(inspectKeyIdentifier, [keyIdentifier]),
											GoAST.createStringLiteral({ value: ": " }),
											call(inspectValueIdentifier, [
												fieldValueIdentifier,
												plus(depthParam, GoAST.createIntegerLiteral({ value: 1n })),
											]),
										),
									]),
								]),
							}),
						],
					}),
				}),
				GoAST.createReturnStatement({
					values: [
						call(inspectReduceToSingleStringIdentifier, [
							partsVariable,
							GoAST.createStringLiteral({ value: "{" }),
							GoAST.createStringLiteral({ value: "}" }),
							depthParam,
						]),
					],
				}),
			],
		}),
	});
	const undefinedBinding = GoAST.createIdentifier("typed");
	const trueLiteral = GoAST.createBooleanLiteral({ value: true });
	const inspectIsUndefinedDeclaration = GoAST.createFunctionDeclaration({
		identifier: isUndefinedIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: valueParam,
				type: GoAST.builtinTypeReferences.any,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.bool],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createTypeSwitchStatementWithoutDefault({
					expression: valueParam,
					identifier: undefinedBinding,
					cases: [
						GoAST.createTypeSwitchCase({
							types: DCommon.cast([jsUndefinedType]),
							statements: [GoAST.createReturnStatement({ values: [trueLiteral] })],
						}),
						GoAST.createTypeSwitchCase({
							types: DCommon.cast([
								GoAST.createInterfaceType({
									elements: [
										GoAST.createInterfaceMethod({
											identifier: GoAST.createIdentifier("InspectPlain"),
											arguments: [],
											returnTypes: [
												GoAST.builtinTypeReferences.any,
												GoAST.builtinTypeReferences.bool,
											],
										}),
									],
								}),
							]),
							statements: [
								GoAST.createVariableDeclarationZeroValue({
									identifier: plainValueVariable,
									typeReference: GoAST.builtinTypeReferences.any,
								}),
								GoAST.createVariableDeclarationZeroValue({
									identifier: isPlainVariable,
									typeReference: GoAST.builtinTypeReferences.bool,
								}),
								GoAST.createAssignmentStatement({
									targets: DCommon.cast([plainValueVariable, isPlainVariable]),
									values: DCommon.cast([selectCall(undefinedBinding, "InspectPlain")]),
								}),
								GoAST.createIfStatement({
									condition: isPlainVariable,
									body: GoAST.createBlockStatement({
										statements: returnCallStatements(isUndefinedIdentifier, [plainValueVariable]),
									}),
								}),
							],
						}),
					],
				}),
				GoAST.createReturnStatement({ values: [falseLiteral] }),
			],
		}),
	});

	const reflectedSliceStatements = [
		GoAST.createShortVariableDeclarationStatement({
			identifier: reflectedIdentifier,
			initializer: packageCall(reflectIdentifier, "ValueOf", [valueParam]),
		}),
		reflectedStructIf,
		GoAST.createIfStatement({
			condition: GoAST.createBinaryExpression({
				operator: "||",
				left: reflectedKindIs("Slice"),
				right: reflectedKindIs("Array"),
			}),
			body: GoAST.createBlockStatement({
				statements: [
					GoAST.createShortVariableDeclarationStatement({
						identifier: partsVariable,
						initializer: GoAST.createSliceLiteral({
							typeReference: sliceOfString,
							elements: [],
						}),
					}),
					GoAST.createRangeStatement({
						binding: GoAST.createRangeDeclaration({ key: indexIdentifier }),
						expression: call(GoAST.createSelectorExpression({
							target: reflectedIdentifier,
							identifier: GoAST.createIdentifier("Len"),
						}), []),
						body: GoAST.createBlockStatement({
							statements: [
								GoAST.createAssignmentStatement({
									targets: DCommon.cast([partsVariable]),
									values: DCommon.cast([
										call(GoAST.createIdentifier("append"), [
											partsVariable,
											call(inspectValueIdentifier, [
												call(GoAST.createSelectorExpression({
													target: call(GoAST.createSelectorExpression({
														target: reflectedIdentifier,
														identifier: GoAST.createIdentifier("Index"),
													}), [indexIdentifier]),
													identifier: GoAST.createIdentifier("Interface"),
												}), []),
												plus(depthParam, GoAST.createIntegerLiteral({ value: 1n })),
											]),
										]),
									]),
								}),
							],
						}),
					}),
					GoAST.createReturnStatement({
						values: [
							call(inspectReduceToSingleStringIdentifier, [
								partsVariable,
								GoAST.createStringLiteral({ value: "[" }),
								GoAST.createStringLiteral({ value: "]" }),
								depthParam,
							]),
						],
					}),
				],
			}),
		}),
	];

	const inspectValueDeclaration = GoAST.createFunctionDeclaration({
		identifier: inspectValueIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: valueParam,
				type: GoAST.builtinTypeReferences.any,
			}),
			GoAST.createFunctionArgument({
				identifier: depthParam,
				type: GoAST.builtinTypeReferences.int,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.string],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createTypeSwitchStatementWithDefault({
					expression: valueParam,
					identifier: typedBinding,
					casesBeforeDefault: [
						GoAST.createTypeSwitchCase({
							types: DCommon.cast([jsNullType]),
							statements: [GoAST.createReturnStatement({ values: [GoAST.createStringLiteral({ value: "null" })] })],
						}),
						GoAST.createTypeSwitchCase({
							types: DCommon.cast([jsUndefinedType]),
							statements: [GoAST.createReturnStatement({ values: [GoAST.createStringLiteral({ value: "undefined" })] })],
						}),
						// ADR-6 amendé (D19) : Print suit util.inspect, qui affiche `-0` ;
						// JSNumberToString suit String(n), qui donne "0" (DString.to).
						GoAST.createTypeSwitchCase({
							types: DCommon.cast([GoAST.builtinTypeReferences.float64]),
							statements: [
								GoAST.createIfStatement({
									condition: GoAST.createBinaryExpression({
										operator: "&&",
										left: GoAST.createBinaryExpression({
											operator: "==",
											left: typedBinding,
											right: GoAST.createIntegerLiteral({ value: 0n }),
										}),
										right: packageCall(mathIdentifier, "Signbit", [typedBinding]),
									}),
									body: GoAST.createBlockStatement({
										statements: [GoAST.createReturnStatement({ values: [GoAST.createStringLiteral({ value: "-0" })] })],
									}),
								}),
								...returnCallStatements(jsNumberToStringFunctionIdentifier, [typedBinding]),
							],
						}),
						GoAST.createTypeSwitchCase({
							types: DCommon.cast([GoAST.builtinTypeReferences.string]),
							statements: [
								GoAST.createReturnStatement({
									values: [
										concat(
											GoAST.createStringLiteral({ value: "'" }),
											typedBinding,
											GoAST.createStringLiteral({ value: "'" }),
										),
									],
								}),
							],
						}),
						GoAST.createTypeSwitchCase({
							types: DCommon.cast([GoAST.builtinTypeReferences.bool]),
							statements: [
								GoAST.createReturnStatement({
									values: [packageCall(strconvIdentifier, "FormatBool", [typedBinding])],
								}),
							],
						}),
						inspectPlainCase,
						GoAST.createTypeSwitchCase({
							types: DCommon.cast([inspectableTypeIdentifier]),
							statements: returnCallStatements(inspectObjectIdentifier, [typedBinding, depthParam]),
						}),
						sliceInspectCase(sliceOfFloat64),
						sliceInspectCase(sliceOfString),
					],
					defaultCase: GoAST.createDefaultCase({
						statements: [
							...reflectedSliceStatements,
							unsupportedValuePanic,
						],
					}),
					casesAfterDefault: [],
				}),
			],
		}),
	});

	const inspectTopLevelDeclaration = GoAST.createFunctionDeclaration({
		identifier: inspectTopLevelIdentifier,
		generic: [],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: valueParam,
				type: GoAST.builtinTypeReferences.any,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.string],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createTypeSwitchStatementWithDefault({
					expression: valueParam,
					identifier: textBinding,
					casesBeforeDefault: [
						GoAST.createTypeSwitchCase({
							types: DCommon.cast([GoAST.builtinTypeReferences.string]),
							statements: [GoAST.createReturnStatement({ values: [textBinding] })],
						}),
						// ADR-13 : valeur nue d'une union (étiquetée ou Either Plain) affichée
						// au premier niveau comme la valeur elle-même (chaîne sans guillemets).
						GoAST.createTypeSwitchCase({
							types: DCommon.cast([
								GoAST.createInterfaceType({
									elements: [
										GoAST.createInterfaceMethod({
											identifier: GoAST.createIdentifier("InspectPlain"),
											arguments: [],
											returnTypes: [
												GoAST.builtinTypeReferences.any,
												GoAST.builtinTypeReferences.bool,
											],
										}),
									],
								}),
							]),
							statements: [
								GoAST.createVariableDeclarationZeroValue({
									identifier: plainValueVariable,
									typeReference: GoAST.builtinTypeReferences.any,
								}),
								GoAST.createVariableDeclarationZeroValue({
									identifier: isPlainVariable,
									typeReference: GoAST.builtinTypeReferences.bool,
								}),
								GoAST.createAssignmentStatement({
									targets: DCommon.cast([plainValueVariable, isPlainVariable]),
									values: DCommon.cast([
										call(
											GoAST.createSelectorExpression({
												target: textBinding,
												identifier: GoAST.createIdentifier("InspectPlain"),
											}),
											[],
										),
									]),
								}),
								GoAST.createIfStatement({
									condition: isPlainVariable,
									body: GoAST.createBlockStatement({
										statements: returnCallStatements(
											inspectTopLevelIdentifier,
											[plainValueVariable],
										),
									}),
								}),
								...returnCallStatements(
									inspectValueIdentifier,
									[valueParam, GoAST.createIntegerLiteral({ value: 0n })],
								),
							],
						}),
					],
					defaultCase: GoAST.createDefaultCase({
						statements: returnCallStatements(
							inspectValueIdentifier,
							[valueParam, GoAST.createIntegerLiteral({ value: 0n })],
						),
					}),
					casesAfterDefault: [],
				}),
			],
		}),
	});

	const printDeclaration = GoAST.createFunctionDeclaration({
		identifier: printFunctionIdentifier,
		generic: [
			GoAST.createTypeParameter({
				identifier: genericT,
				constraint: GoAST.builtinTypeReferences.any,
			}),
		],
		arguments: [
			GoAST.createFunctionArgument({
				identifier: valueParam,
				type: genericT,
			}),
		],
		returnTypes: [genericT],
		body: GoAST.createBlockStatement({
			statements: [
				packageCall(fmtIdentifier, "Println", [call(inspectTopLevelIdentifier, [valueParam])]),
				GoAST.createReturnStatement({ values: [valueParam] }),
			],
		}),
	});

	return createSharedDependency({
		imports: [
			GoAST.createImportDeclaration({ path: "fmt" }),
			GoAST.createImportDeclaration({ path: "math" }),
			GoAST.createImportDeclaration({ path: "reflect" }),
			GoAST.createImportDeclaration({ path: "strconv" }),
			GoAST.createImportDeclaration({ path: "strings" }),
		],
		init: [],
		declarations: [
			inspectBreakLengthDeclaration,
			inspectEntryTypeDeclaration,
			inspectableTypeDeclaration,
			jsNumberToStringDeclaration,
			inspectIsIdentifierStartDeclaration,
			inspectIsIdentifierPartDeclaration,
			inspectIsIdentifierKeyDeclaration,
			inspectKeyDeclaration,
			inspectIsBelowBreakLengthDeclaration,
			inspectReduceToSingleStringDeclaration,
			inspectObjectDeclaration,
			inspectIsUndefinedDeclaration,
			inspectValueDeclaration,
			inspectTopLevelDeclaration,
			printDeclaration,
		],
	});
});

import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";
import { inspectEntryTypeIdentifier } from "../../../sharedDependency/defaults/inspect";

// Représentation A de l'ADR-1 (docs/decisions/ADR-1-either.md) :
// Success<T>, Fail, Left<I, T>, Right<I, T> et leurs unions partagent Either[V].

export const eitherKindIdentifier = GoAST.createIdentifier("EitherKind");
export const eitherTypeIdentifier = GoAST.createIdentifier("Either");
// V d'un Either sans valeur (Fail seul) : JSUndefined, dépendance par défaut.
export const eitherNoValueIdentifier = GoAST.createIdentifier("JSUndefined");
export const eitherSuccessFunctionIdentifier = GoAST.createIdentifier("EitherSuccessOf");
export const eitherFailFunctionIdentifier = GoAST.createIdentifier("EitherFailOf");
export const eitherLeftFunctionIdentifier = GoAST.createIdentifier("EitherLeftOf");
export const either2TypeIdentifier = GoAST.createIdentifier("Either2");
export const either2SuccessFunctionIdentifier = GoAST.createIdentifier("Either2SuccessOf");
export const either2FromLeftFunctionIdentifier = GoAST.createIdentifier("Either2FromLeft");
// ADR-2 : valeur nue (non Either) rangée dans une union Either[V].
export const eitherPlainFunctionIdentifier = GoAST.createIdentifier("EitherPlainOf");
// ADR-2 : Either[From] vers Either[To] quand les variantes en jeu n'ont pas de valeur.
export const eitherRetypeFunctionIdentifier = GoAST.createIdentifier("EitherRetype");

export const eitherKindIdentifiers = {
	right: GoAST.createIdentifier("EitherKindRight"),
	left: GoAST.createIdentifier("EitherKindLeft"),
	success: GoAST.createIdentifier("EitherKindSuccess"),
	fail: GoAST.createIdentifier("EitherKindFail"),
	plain: GoAST.createIdentifier("EitherKindPlain"),
} as const;

const eitherKeyPrefix = "@duplojs/lang/kind/@DuplojsLangEither/";

export const eitherDependency = DCommon.memo(() => {
	const generic = GoAST.createIdentifier("V");
	const receiver = GoAST.createIdentifier("e");
	const valueArgument = GoAST.createIdentifier("value");
	const informationArgument = GoAST.createIdentifier("information");
	const fieldIdentifiers = {
		kind: GoAST.createIdentifier("Kind"),
		information: GoAST.createIdentifier("Information"),
		value: GoAST.createIdentifier("Value"),
	};
	const inspectFieldIdentifiers = {
		key: GoAST.createIdentifier("Key"),
		value: GoAST.createIdentifier("Value"),
	};

	const typeParameter = GoAST.createTypeParameter({
		identifier: generic,
		constraint: GoAST.builtinTypeReferences.any,
	});

	const eitherOfGeneric = GoAST.createGenericTypeReference({
		typeReference: eitherTypeIdentifier,
		typeArguments: DCommon.cast([generic]),
	});

	const retypeToParameter = GoAST.createTypeParameter({
		identifier: GoAST.createIdentifier("To"),
		constraint: GoAST.builtinTypeReferences.any,
	});

	const retypeFromParameter = GoAST.createTypeParameter({
		identifier: GoAST.createIdentifier("From"),
		constraint: GoAST.builtinTypeReferences.any,
	});

	const eitherOfRetypeTo = GoAST.createGenericTypeReference({
		typeReference: eitherTypeIdentifier,
		typeArguments: DCommon.cast([retypeToParameter.identifier]),
	});

	const receiverField = (field: GoAST.Identifier) => GoAST.createSelectorExpression({
		target: receiver,
		identifier: field,
	});

	const kindEquals = (kind: GoAST.Identifier) => GoAST.createBinaryExpression({
		operator: "==",
		left: receiverField(fieldIdentifiers.kind),
		right: kind,
	});

	const eitherLiteral = (
		kind: GoAST.Identifier,
		information: GoAST.Expression,
		value: GoAST.Expression | undefined,
	) => GoAST.createStructLiteral({
		typeReference: eitherOfGeneric,
		elements: [
			GoAST.createKeyedElement({
				key: fieldIdentifiers.kind,
				value: kind,
			}),
			GoAST.createKeyedElement({
				key: fieldIdentifiers.information,
				value: information,
			}),
			...(value
				? [
					GoAST.createKeyedElement({
						key: fieldIdentifiers.value,
						value,
					}),
				]
				: []),
		],
	});

	const inspectEntry = (key: string, value: GoAST.Expression) => GoAST.createStructLiteral({
		typeReference: inspectEntryTypeIdentifier,
		elements: [
			GoAST.createKeyedElement({
				key: inspectFieldIdentifiers.key,
				value: GoAST.createStringLiteral({ value: `${eitherKeyPrefix}${key}` }),
			}),
			GoAST.createKeyedElement({
				key: inspectFieldIdentifiers.value,
				value,
			}),
		],
	});

	const nullLiteral = GoAST.createStructLiteral({
		typeReference: GoAST.createIdentifier("JSNull"),
		elements: [],
	});

	const undefinedLiteral = GoAST.createStructLiteral({
		typeReference: GoAST.createIdentifier("JSUndefined"),
		elements: [],
	});
	const either2LeftTypeParameter = GoAST.createTypeParameter({
		identifier: GoAST.createIdentifier("L"),
		constraint: GoAST.builtinTypeReferences.any,
	});
	const either2RightTypeParameter = GoAST.createTypeParameter({
		identifier: GoAST.createIdentifier("R"),
		constraint: GoAST.builtinTypeReferences.any,
	});
	const either2OfGeneric = GoAST.createGenericTypeReference({
		typeReference: either2TypeIdentifier,
		typeArguments: DCommon.cast([
			either2LeftTypeParameter.identifier,
			either2RightTypeParameter.identifier,
		]),
	});
	const either2Receiver = GoAST.createIdentifier("e");
	const either2LeftArgument = GoAST.createIdentifier("left");
	const either2RightArgument = GoAST.createIdentifier("right");
	const either2SourceArgument = GoAST.createIdentifier("source");
	const either2Fields = {
		kind: GoAST.createIdentifier("Kind"),
		information: GoAST.createIdentifier("Information"),
		left: GoAST.createIdentifier("Left"),
		right: GoAST.createIdentifier("Right"),
	};
	const either2ReceiverField = (field: GoAST.Identifier) => GoAST.createSelectorExpression({
		target: either2Receiver,
		identifier: field,
	});
	const either2IsSideMethod = (
		identifier: GoAST.Identifier,
		kinds: readonly [GoAST.Identifier, GoAST.Identifier],
	) => GoAST.createMethodDeclaration({
		identifier,
		receiver: [either2Receiver, either2OfGeneric],
		generic: [],
		arguments: [],
		returnTypes: [GoAST.builtinTypeReferences.bool],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createReturnStatement({
					values: [
						GoAST.createBinaryExpression({
							operator: "||",
							left: GoAST.createBinaryExpression({
								operator: "==",
								left: either2ReceiverField(either2Fields.kind),
								right: kinds[0],
							}),
							right: GoAST.createBinaryExpression({
								operator: "==",
								left: either2ReceiverField(either2Fields.kind),
								right: kinds[1],
							}),
						}),
					],
				}),
			],
		}),
	});
	const either2InspectEntries = (
		side: "left" | "right",
		value: GoAST.Expression,
		tag: "success" | "fail" | undefined,
	) => GoAST.createReturnStatement({
		values: [
			GoAST.createSliceLiteral({
				typeReference: GoAST.createSliceType({
					elementType: inspectEntryTypeIdentifier,
				}),
				elements: [
					inspectEntry(side, nullLiteral),
					inspectEntry("information", either2ReceiverField(either2Fields.information)),
					inspectEntry("value", value),
					...(tag ? [inspectEntry(tag, nullLiteral)] : []),
				],
			}),
		],
	});
	const either2Literal = (
		kind: GoAST.Expression,
		information: GoAST.Expression,
		left: GoAST.Expression | undefined,
		right: GoAST.Expression | undefined,
	) => GoAST.createStructLiteral({
		typeReference: either2OfGeneric,
		elements: [
			GoAST.createKeyedElement({
				key: either2Fields.kind,
				value: kind,
			}),
			GoAST.createKeyedElement({
				key: either2Fields.information,
				value: information,
			}),
			...(left
				? [
					GoAST.createKeyedElement({
						key: either2Fields.left,
						value: left,
					}),
				]
				: []),
			...(right
				? [
					GoAST.createKeyedElement({
						key: either2Fields.right,
						value: right,
					}),
				]
				: []),
		],
	});
	const either2Declarations = [
		GoAST.createTypeDefinition({
			identifier: either2TypeIdentifier,
			generic: [either2LeftTypeParameter, either2RightTypeParameter],
			type: GoAST.createStructType({
				fields: [
					GoAST.createStructField({
						identifier: either2Fields.kind,
						typeReference: eitherKindIdentifier,
					}),
					GoAST.createStructField({
						identifier: either2Fields.information,
						typeReference: GoAST.builtinTypeReferences.string,
					}),
					GoAST.createStructField({
						identifier: either2Fields.left,
						typeReference: either2LeftTypeParameter.identifier,
					}),
					GoAST.createStructField({
						identifier: either2Fields.right,
						typeReference: either2RightTypeParameter.identifier,
					}),
				],
			}),
		}),
		GoAST.createFunctionDeclaration({
			identifier: either2SuccessFunctionIdentifier,
			generic: [either2LeftTypeParameter, either2RightTypeParameter],
			arguments: [
				GoAST.createFunctionArgument({
					identifier: either2RightArgument,
					type: either2RightTypeParameter.identifier,
				}),
			],
			returnTypes: [either2OfGeneric],
			body: GoAST.createBlockStatement({
				statements: [
					GoAST.createReturnStatement({
						values: [
							either2Literal(
								eitherKindIdentifiers.success,
								GoAST.createStringLiteral({ value: "success" }),
								undefined,
								either2RightArgument,
							),
						],
					}),
				],
			}),
		}),
		GoAST.createFunctionDeclaration({
			identifier: either2FromLeftFunctionIdentifier,
			generic: [either2LeftTypeParameter, either2RightTypeParameter],
			arguments: [
				GoAST.createFunctionArgument({
					identifier: either2SourceArgument,
					type: GoAST.createGenericTypeReference({
						typeReference: eitherTypeIdentifier,
						typeArguments: DCommon.cast([either2LeftTypeParameter.identifier]),
					}),
				}),
			],
			returnTypes: [either2OfGeneric],
			body: GoAST.createBlockStatement({
				statements: [
					GoAST.createReturnStatement({
						values: [
							either2Literal(
								GoAST.createSelectorExpression({
									target: either2SourceArgument,
									identifier: fieldIdentifiers.kind,
								}),
								GoAST.createSelectorExpression({
									target: either2SourceArgument,
									identifier: fieldIdentifiers.information,
								}),
								GoAST.createSelectorExpression({
									target: either2SourceArgument,
									identifier: fieldIdentifiers.value,
								}),
								undefined,
							),
						],
					}),
				],
			}),
		}),
		either2IsSideMethod(
			GoAST.createIdentifier("IsRight"),
			[eitherKindIdentifiers.right, eitherKindIdentifiers.success],
		),
		either2IsSideMethod(
			GoAST.createIdentifier("IsLeft"),
			[eitherKindIdentifiers.left, eitherKindIdentifiers.fail],
		),
		GoAST.createMethodDeclaration({
			identifier: GoAST.createIdentifier("InspectPlain"),
			receiver: [either2Receiver, either2OfGeneric],
			generic: [],
			arguments: [],
			returnTypes: [GoAST.builtinTypeReferences.any, GoAST.builtinTypeReferences.bool],
			body: GoAST.createBlockStatement({
				statements: [
					// ADR-13 : valeur nue rangée dans Either2 (Either2PlainOf), côté droit.
					GoAST.createIfStatement({
						condition: GoAST.createBinaryExpression({
							operator: "==",
							left: either2ReceiverField(either2Fields.kind),
							right: eitherKindIdentifiers.plain,
						}),
						body: GoAST.createBlockStatement({
							statements: [
								GoAST.createReturnStatement({
									values: [
										either2ReceiverField(either2Fields.right),
										GoAST.createBooleanLiteral({ value: true }),
									],
								}),
							],
						}),
					}),
					GoAST.createReturnStatement({
						values: [
							GoAST.createNilLiteral({}),
							GoAST.createBooleanLiteral({ value: false }),
						],
					}),
				],
			}),
		}),
		GoAST.createMethodDeclaration({
			identifier: GoAST.createIdentifier("InspectEntries"),
			receiver: [either2Receiver, either2OfGeneric],
			generic: [],
			arguments: [],
			returnTypes: [
				GoAST.createSliceType({
					elementType: inspectEntryTypeIdentifier,
				}),
			],
			body: GoAST.createBlockStatement({
				statements: [
					GoAST.createExpressionSwitchStatementWithDefault({
						expression: either2ReceiverField(either2Fields.kind),
						casesBeforeDefault: [
							GoAST.createExpressionSwitchCase({
								expressions: DCommon.cast([eitherKindIdentifiers.success]),
								statements: [
									either2InspectEntries(
										"right",
										either2ReceiverField(either2Fields.right),
										"success",
									),
								],
							}),
							GoAST.createExpressionSwitchCase({
								expressions: DCommon.cast([eitherKindIdentifiers.fail]),
								statements: [either2InspectEntries("left", undefinedLiteral, "fail")],
							}),
							GoAST.createExpressionSwitchCase({
								expressions: DCommon.cast([eitherKindIdentifiers.right]),
								statements: [
									either2InspectEntries(
										"right",
										either2ReceiverField(either2Fields.right),
										undefined,
									),
								],
							}),
						],
						defaultCase: GoAST.createDefaultCase({
							statements: [
								either2InspectEntries(
									"left",
									either2ReceiverField(either2Fields.left),
									undefined,
								),
							],
						}),
						casesAfterDefault: [],
					}),
				],
			}),
		}),
	];

	// Ordre des clés identique à celui affiché par DCommon.print
	// (docs/duplojs-semantics.md, Q2) : côté, information, value, puis tag éventuel.
	const returnInspectEntries = (
		side: "right" | "left",
		value: GoAST.Expression,
		tag: "success" | "fail" | undefined,
	) => GoAST.createReturnStatement({
		values: [
			GoAST.createSliceLiteral({
				typeReference: GoAST.createSliceType({
					elementType: inspectEntryTypeIdentifier,
				}),
				elements: [
					inspectEntry(side, nullLiteral),
					inspectEntry("information", receiverField(fieldIdentifiers.information)),
					inspectEntry("value", value),
					...(tag ? [inspectEntry(tag, nullLiteral)] : []),
				],
			}),
		],
	});

	const isSideMethod = (
		identifier: GoAST.Identifier,
		kinds: readonly [GoAST.Identifier, GoAST.Identifier],
	) => GoAST.createMethodDeclaration({
		identifier,
		receiver: [receiver, eitherOfGeneric],
		generic: [],
		arguments: [],
		returnTypes: [GoAST.builtinTypeReferences.bool],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createReturnStatement({
					values: [
						GoAST.createBinaryExpression({
							operator: "||",
							left: kindEquals(kinds[0]),
							right: kindEquals(kinds[1]),
						}),
					],
				}),
			],
		}),
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeDefinition({
				identifier: eitherKindIdentifier,
				type: GoAST.builtinTypeReferences.uint8,
			}),
			...DArray.map(
				[
					eitherKindIdentifiers.right,
					eitherKindIdentifiers.left,
					eitherKindIdentifiers.success,
					eitherKindIdentifiers.fail,
					eitherKindIdentifiers.plain,
				],
				(identifier, { index }) => GoAST.createConstantDeclaration({
					identifier,
					typeReference: eitherKindIdentifier,
					initializer: GoAST.createIntegerLiteral({ value: BigInt(index) }),
				}),
			),
			GoAST.createTypeDefinition({
				identifier: eitherTypeIdentifier,
				generic: [typeParameter],
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: fieldIdentifiers.kind,
							typeReference: eitherKindIdentifier,
						}),
						GoAST.createStructField({
							identifier: fieldIdentifiers.information,
							typeReference: GoAST.builtinTypeReferences.string,
						}),
						GoAST.createStructField({
							identifier: fieldIdentifiers.value,
							typeReference: generic,
						}),
					],
				}),
			}),
			GoAST.createFunctionDeclaration({
				identifier: eitherSuccessFunctionIdentifier,
				generic: [typeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: valueArgument,
						type: generic,
					}),
				],
				returnTypes: [eitherOfGeneric],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								eitherLiteral(
									eitherKindIdentifiers.success,
									GoAST.createStringLiteral({ value: "success" }),
									valueArgument,
								),
							],
						}),
					],
				}),
			}),
			// fail() n'a pas de valeur (undefined en JS) : Value garde la valeur zéro de V.
			GoAST.createFunctionDeclaration({
				identifier: eitherFailFunctionIdentifier,
				generic: [typeParameter],
				arguments: [],
				returnTypes: [eitherOfGeneric],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								eitherLiteral(
									eitherKindIdentifiers.fail,
									GoAST.createStringLiteral({ value: "fail" }),
									undefined,
								),
							],
						}),
					],
				}),
			}),
			// left(information, value) : Left générique, information portée telle quelle.
			GoAST.createFunctionDeclaration({
				identifier: eitherLeftFunctionIdentifier,
				generic: [typeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: informationArgument,
						type: GoAST.builtinTypeReferences.string,
					}),
					GoAST.createFunctionArgument({
						identifier: valueArgument,
						type: generic,
					}),
				],
				returnTypes: [eitherOfGeneric],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								eitherLiteral(
									eitherKindIdentifiers.left,
									informationArgument,
									valueArgument,
								),
							],
						}),
					],
				}),
			}),
			// ADR-2 : une valeur nue (ex. le tableau renvoyé par coalescing dans
			// whenIsRight) garde sa représentation par valeur dans Either[V].
			// Elle n'a ni côté ni information : IsRight et IsLeft sont faux,
			// comme DEither.isRight / isLeft à l'exécution sur une valeur non Either.
			GoAST.createFunctionDeclaration({
				identifier: eitherPlainFunctionIdentifier,
				generic: [typeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: valueArgument,
						type: generic,
					}),
				],
				returnTypes: [eitherOfGeneric],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference: eitherOfGeneric,
									elements: [
										GoAST.createKeyedElement({
											key: fieldIdentifiers.kind,
											value: eitherKindIdentifiers.plain,
										}),
										GoAST.createKeyedElement({
											key: fieldIdentifiers.value,
											value: valueArgument,
										}),
									],
								}),
							],
						}),
					],
				}),
			}),
			// Either[From] vers Either[To] : conserve Kind et Information, abandonne
			// Value. Correct uniquement pour des variantes sans valeur (Fail) :
			// coerceExpression ne l'émet que dans ce cas (ADR-2).
			GoAST.createFunctionDeclaration({
				identifier: eitherRetypeFunctionIdentifier,
				generic: [retypeToParameter, retypeFromParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: receiver,
						type: GoAST.createGenericTypeReference({
							typeReference: eitherTypeIdentifier,
							typeArguments: DCommon.cast([retypeFromParameter.identifier]),
						}),
					}),
				],
				returnTypes: [eitherOfRetypeTo],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference: eitherOfRetypeTo,
									elements: [
										GoAST.createKeyedElement({
											key: fieldIdentifiers.kind,
											value: receiverField(fieldIdentifiers.kind),
										}),
										GoAST.createKeyedElement({
											key: fieldIdentifiers.information,
											value: receiverField(fieldIdentifiers.information),
										}),
									],
								}),
							],
						}),
					],
				}),
			}),
			isSideMethod(
				GoAST.createIdentifier("IsRight"),
				[eitherKindIdentifiers.right, eitherKindIdentifiers.success],
			),
			isSideMethod(
				GoAST.createIdentifier("IsLeft"),
				[eitherKindIdentifiers.left, eitherKindIdentifiers.fail],
			),
			// Contrat ADR-2 avec Print (defaults/inspect) : Print teste InspectPlain
			// AVANT InspectEntries ; un Plain s'affiche donc comme sa valeur nue et
			// InspectEntries n'est jamais appelé pour lui.
			GoAST.createMethodDeclaration({
				identifier: GoAST.createIdentifier("InspectPlain"),
				receiver: [receiver, eitherOfGeneric],
				generic: [],
				arguments: [],
				returnTypes: [GoAST.builtinTypeReferences.any, GoAST.builtinTypeReferences.bool],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createIfStatement({
							condition: kindEquals(eitherKindIdentifiers.plain),
							body: GoAST.createBlockStatement({
								statements: [
									GoAST.createReturnStatement({
										values: [
											receiverField(fieldIdentifiers.value),
											GoAST.createBooleanLiteral({ value: true }),
										],
									}),
								],
							}),
						}),
						GoAST.createReturnStatement({
							values: [
								GoAST.createNilLiteral({}),
								GoAST.createBooleanLiteral({ value: false }),
							],
						}),
					],
				}),
			}),
			GoAST.createMethodDeclaration({
				identifier: GoAST.createIdentifier("InspectEntries"),
				receiver: [receiver, eitherOfGeneric],
				generic: [],
				arguments: [],
				returnTypes: [
					GoAST.createSliceType({
						elementType: inspectEntryTypeIdentifier,
					}),
				],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createExpressionSwitchStatementWithDefault({
							expression: receiverField(fieldIdentifiers.kind),
							casesBeforeDefault: [
								GoAST.createExpressionSwitchCase({
									expressions: DCommon.cast([eitherKindIdentifiers.success]),
									statements: [
										returnInspectEntries(
											"right",
											receiverField(fieldIdentifiers.value),
											"success",
										),
									],
								}),
								GoAST.createExpressionSwitchCase({
									expressions: DCommon.cast([eitherKindIdentifiers.fail]),
									statements: [returnInspectEntries("left", undefinedLiteral, "fail")],
								}),
								GoAST.createExpressionSwitchCase({
									expressions: DCommon.cast([eitherKindIdentifiers.right]),
									statements: [
										returnInspectEntries(
											"right",
											receiverField(fieldIdentifiers.value),
											undefined,
										),
									],
								}),
							],
							defaultCase: GoAST.createDefaultCase({
								statements: [
									returnInspectEntries(
										"left",
										receiverField(fieldIdentifiers.value),
										undefined,
									),
								],
							}),
							casesAfterDefault: [],
						}),
					],
				}),
			}),
			...either2Declarations,
		],
	});
});

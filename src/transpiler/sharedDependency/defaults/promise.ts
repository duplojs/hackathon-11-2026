import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const promiseTypeIdentifier = GoAST.createIdentifier("Promise");
export const newPromiseFunctionIdentifier = GoAST.createIdentifier("NewPromise");
export const awaitMethodIdentifier = GoAST.createIdentifier("Await");

export const promiseShardDependency = DCommon.memo(() => {
	const tGeneric = GoAST.createIdentifier("T");
	const pIdent = GoAST.createIdentifier("p");
	const fnIdent = GoAST.createIdentifier("fn");

	const tTypeParameter = GoAST.createTypeParameter({
		identifier: tGeneric,
		constraint: GoAST.builtinTypeReferences.any,
	});

	const promiseGenericTypeRef = GoAST.createGenericTypeReference({
		typeReference: promiseTypeIdentifier,
		typeArguments: DCommon.cast([tGeneric]),
	});

	const promisePointerType = GoAST.createPointerType({
		typeReference: promiseGenericTypeRef,
	});

	const chanType = GoAST.createChannelType({
		direction: "bidirectional",
		elementType: GoAST.createStructType({ fields: [] }),
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			// type Promise[T any] struct { ch chan struct{}; result T }
			GoAST.createTypeDefinition({
				identifier: promiseTypeIdentifier,
				generic: [tTypeParameter],
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("ch"),
							typeReference: chanType,
						}),
						GoAST.createStructField({
							identifier: GoAST.createIdentifier("result"),
							typeReference: tGeneric,
						}),
					],
				}),
			}),

			// func NewPromise[T any](fn func() T) *Promise[T] { ... }
			GoAST.createFunctionDeclaration({
				identifier: newPromiseFunctionIdentifier,
				generic: [tTypeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: fnIdent,
						type: GoAST.createFunctionType({
							arguments: [],
							returnTypes: [tGeneric],
						}),
					}),
				],
				returnTypes: [promisePointerType],
				body: GoAST.createBlockStatement({
					statements: [
						// p := &Promise[T]{ch: make(chan struct{})}
						GoAST.createShortVariableDeclarationStatement({
							identifier: pIdent,
							initializer: GoAST.createAddressExpression({
								operand: GoAST.createStructLiteral({
									typeReference: promiseGenericTypeRef,
									elements: [
										GoAST.createKeyedElement({
											key: GoAST.createIdentifier("ch"),
											value: GoAST.createCallExpression({
												callee: GoAST.createIdentifier("make"),
												typeArgument: chanType,
												arguments: [],
											}),
										}),
									],
								}),
							}),
						}),

						// go func() { defer close(p.ch); p.result = fn() }()
						GoAST.createGoStatement({
							call: GoAST.createCallExpression({
								callee: GoAST.createFunctionLiteral({
									arguments: [],
									returnTypes: [],
									body: GoAST.createBlockStatement({
										statements: [
											GoAST.createDeferStatement({
												call: GoAST.createCallExpression({
													callee: GoAST.createIdentifier("close"),
													arguments: [
														GoAST.createSelectorExpression({
															target: pIdent,
															identifier: GoAST.createIdentifier("ch"),
														}),
													],
												}),
											}),
											GoAST.createAssignmentStatement({
												targets: DCommon.cast([
													GoAST.createSelectorExpression({
														target: pIdent,
														identifier: GoAST.createIdentifier("result"),
													}),
												]),
												values: DCommon.cast([
													GoAST.createCallExpression({
														callee: fnIdent,
														arguments: [],
													}),
												]),
											}),
										],
									}),
								}),
								arguments: [],
							}),
						}),

						// return p
						GoAST.createReturnStatement({
							values: DCommon.cast([pIdent]),
						}),
					],
				}),
			}),

			// func (p *Promise[T]) Await() T { <-p.ch; return p.result }
			GoAST.createMethodDeclaration({
				identifier: awaitMethodIdentifier,
				receiver: [pIdent, promisePointerType],
				generic: [],
				arguments: [],
				returnTypes: [tGeneric],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReceiveExpression({
							operand: GoAST.createSelectorExpression({
								target: pIdent,
								identifier: GoAST.createIdentifier("ch"),
							}),
						}),
						GoAST.createReturnStatement({
							values: DCommon.cast([
								GoAST.createSelectorExpression({
									target: pIdent,
									identifier: GoAST.createIdentifier("result"),
								}),
							]),
						}),
					],
				}),
			}),
		],
	});
});

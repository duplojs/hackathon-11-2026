import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind } from "typescript/async";
import type { BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { invokeCallable, getEitherRightValueType } from "../../callable";
import {
	eitherDependency,
	eitherTypeIdentifier,
	getValueMethodIdentifier,
	isRightMethodIdentifier,
} from "../../either/sharedDependency";
import {
	arrayMapDependency,
	arrayMapFunctionIdentifier,
	arrayMapIndexFunctionIdentifier,
} from "../../array/map/sharedDependency";
import { transformCheckerType } from "../../../type/fromChecker";

export async function pipeExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (!TsAST.isCallExpression(node) || node.arguments.length < 2) {
		return context.notSupport();
	}

	const { typeChecker } = context.transpilation;

	const [initArg] = node.arguments;
	if (!initArg) {
		return context.error(node, "pipe-missing-init-argument");
	}
	const transformedInit = await DCommon.asyncPipe(
		context.transform(initArg, expressionTransformers.value),
		DEither.unwrapRight,
	);
	if (DEither.isLeft(transformedInit)) {
		return transformedInit;
	}

	let currentExpr: GoAST.Expression = transformedInit.result;
	const beforeStatements: GoAST.Statement[] = [...(transformedInit.before ?? [])];

	for (let stepIndex = 1; stepIndex < node.arguments.length; stepIndex++) {
		const stepNode = node.arguments[stepIndex];
		if (!stepNode) {
			return context.error(node, "pipe-missing-step-argument");
		}

		// Détection DEither.unwrapRight : passthrough en Go
		if (TsAST.isPropertyAccessExpression(stepNode) || TsAST.isIdentifier(stepNode)) {
			const modRef = await DCommon.asyncPipe(
				context.resolveReferenceModule(stepNode, "@duplojs/lang", /^dist\/either\//),
				DEither.unwrapRight,
			);
			if (!DEither.isLeft(modRef) && modRef.exportName === "unwrapRight") {
				if (node.parent && TsAST.isVariableDeclaration(node.parent) && TsAST.isIdentifier(node.parent.name)) {
					const sym = await typeChecker.getSymbolAtLocation(node.parent.name);
					if (sym) {
						context.file.unwrappedVariables.add(sym);
					}
				}
				continue;
			}
		}

		// Détection appel currying : stepNode est un CallExpression
		if (TsAST.isCallExpression(stepNode)) {
			const callee = stepNode.expression;
			if (TsAST.isPropertyAccessExpression(callee) || TsAST.isIdentifier(callee)) {
				const modRef = await DCommon.asyncPipe(
					context.resolveReferenceModule(callee, "@duplojs/lang"),
					DEither.unwrapRight,
				);

				if (!DEither.isLeft(modRef)) {
					const { exportName, entry } = modRef;

					// whenIsRight(fn) dans pipe
					if (exportName === "whenIsRight" && entry.startsWith("dist/either/") && stepNode.arguments.length === 1) {
						const [fnArg] = stepNode.arguments;
						if (!fnArg) {
							return context.error(stepNode, "pipe-whenIsRight-missing-argument");
						}
						const eitherVar = currentExpr;

						const prevArg = node.arguments[stepIndex - 1];
						if (!prevArg) {
							return context.error(node, "pipe-missing-prev-argument");
						}
						const prevType = await typeChecker.getTypeAtLocation(prevArg);
						const rightValueType = await getEitherRightValueType(prevType, stepNode, context);

						let argExpr: GoAST.Expression = eitherVar;
						if (rightValueType) {
							argExpr = GoAST.createTypeAssertionExpression({
								target: GoAST.createCallExpression({
									callee: GoAST.createSelectorExpression({
										target: eitherVar,
										identifier: getValueMethodIdentifier,
									}),
									arguments: [],
								}),
								typeReference: rightValueType,
							});
						}

						const invoked = await DCommon.asyncPipe(
							invokeCallable(fnArg, argExpr, context),
							DEither.unwrapRight,
						);
						if (DEither.isLeft(invoked)) {
							return context.error(stepNode, "pipe-whenIsRight-error");
						}

						const resultVar = context.generateIdentifier();

						let resultType: GoAST.Type | GoAST.TypeReference = GoAST.builtinTypeReferences.any;
						const fnType = await typeChecker.getTypeAtLocation(fnArg);
						const fnRightType = await getEitherRightValueType(fnType, fnArg, context);
						if (fnRightType !== undefined) {
							resultType = GoAST.createPackageTypeReference({
								packageName: context.registerSharedDependency(eitherDependency.value),
								identifier: eitherTypeIdentifier,
							});
						}

						const resultVarDecl = GoAST.createVariableDeclarationZeroValue({
							identifier: resultVar,
							typeReference: resultType,
						});

						const ifStmt = GoAST.createIfStatement({
							condition: GoAST.createCallExpression({
								callee: GoAST.createSelectorExpression({
									target: eitherVar,
									identifier: isRightMethodIdentifier,
								}),
								arguments: [],
							}),
							body: GoAST.createBlockStatement({
								statements: [
									...invoked.before,
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([resultVar]),
										values: DCommon.cast([invoked.result]),
									}),
								],
							}),
							elseBranch: GoAST.createBlockStatement({
								statements: [
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([resultVar]),
										values: DCommon.cast([eitherVar]),
									}),
								],
							}),
						});

						beforeStatements.push(resultVarDecl, ifStmt);
						currentExpr = resultVar;
						continue;
					}

					// whenIsRightOtherwise(onRight, onLeft) dans pipe
					if (exportName === "whenIsRightOtherwise" && entry.startsWith("dist/either/") && stepNode.arguments.length === 2) {
						const [onRightArg, onLeftArg] = stepNode.arguments;
						if (!onRightArg || !onLeftArg) {
							return context.error(stepNode, "pipe-whenIsRightOtherwise-missing-arguments");
						}
						const eitherVar = currentExpr;

						const prevArg = node.arguments[stepIndex - 1];
						if (!prevArg) {
							return context.error(node, "pipe-missing-prev-argument");
						}
						const prevType = await typeChecker.getTypeAtLocation(prevArg);
						const rightValueType = await getEitherRightValueType(prevType, stepNode, context);

						let argExpr: GoAST.Expression = eitherVar;
						if (rightValueType) {
							argExpr = GoAST.createTypeAssertionExpression({
								target: GoAST.createCallExpression({
									callee: GoAST.createSelectorExpression({
										target: eitherVar,
										identifier: getValueMethodIdentifier,
									}),
									arguments: [],
								}),
								typeReference: rightValueType,
							});
						}

						const invokedRight = await DCommon.asyncPipe(
							invokeCallable(onRightArg, argExpr, context),
							DEither.unwrapRight,
						);
						if (DEither.isLeft(invokedRight)) {
							return context.error(stepNode, {
								message: "pipe-whenIsRightOtherwise-onRight-error",
								cause: invokedRight,
							});
						}

						let leftExpectsArg = false;
						if (TsAST.isArrowFunction(onLeftArg) || TsAST.isFunctionExpression(onLeftArg)) {
							leftExpectsArg = onLeftArg.parameters.length >= 1;
						} else {
							const leftFnType = await typeChecker.getTypeAtLocation(onLeftArg);
							const leftSigs = await typeChecker.getSignaturesOfType(leftFnType, SignatureKind.Call);
							const firstSig = leftSigs[0];
							if (firstSig) {
								const sigParams = await firstSig.getParameters();
								leftExpectsArg = sigParams.length >= 1;
							}
						}

						const invokedLeft = await DCommon.asyncPipe(
							invokeCallable(onLeftArg, leftExpectsArg ? eitherVar : undefined, context),
							DEither.unwrapRight,
						);
						if (DEither.isLeft(invokedLeft)) {
							return context.error(stepNode, "pipe-whenIsRightOtherwise-onLeft-error");
						}

						// Type statique de retour via la signature de onLeftArg
						let resultType: GoAST.Type | GoAST.TypeReference = GoAST.builtinTypeReferences.any;
						const leftSig = DArray.first(
							await typeChecker.getSignaturesOfType(
								await typeChecker.getTypeAtLocation(onLeftArg),
								SignatureKind.Call,
							),
						);
						if (leftSig) {
							const retType = await typeChecker.getReturnTypeOfSignature(leftSig);
							const transformed = await DCommon.asyncPipe(
								transformCheckerType(retType, onLeftArg, context),
								DEither.unwrapRight,
							);
							if (!DEither.isLeft(transformed)) {
								resultType = transformed.result;
								if (DModeling.hasTagValue(resultType, "[node][type]array")) {
									const arr = resultType as GoAST.ArrayType;
									if (DModeling.hasTagValue(arr.length, "[node][expression]literal-integer") && (arr.length as GoAST.IntegerLiteral).value === 1n) {
										resultType = GoAST.createSliceType({ elementType: arr.elementType });
									}
								}
							}
						}

						const resultVar = context.generateIdentifier();
						const resultVarDecl = GoAST.createVariableDeclarationZeroValue({
							identifier: resultVar,
							typeReference: resultType,
						});

						const ifStmt = GoAST.createIfStatement({
							condition: GoAST.createCallExpression({
								callee: GoAST.createSelectorExpression({
									target: eitherVar,
									identifier: isRightMethodIdentifier,
								}),
								arguments: [],
							}),
							body: GoAST.createBlockStatement({
								statements: [
									...invokedRight.before,
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([resultVar]),
										values: DCommon.cast([invokedRight.result]),
									}),
								],
							}),
							elseBranch: GoAST.createBlockStatement({
								statements: [
									...invokedLeft.before,
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([resultVar]),
										values: DCommon.cast([invokedLeft.result]),
									}),
								],
							}),
						});

						beforeStatements.push(resultVarDecl, ifStmt);
						currentExpr = resultVar;
						continue;
					}

					// DArray.map(fn) dans pipe
					if (exportName === "map" && entry.startsWith("dist/array/") && stepNode.arguments.length === 1) {
						const [fnArg] = stepNode.arguments;
						if (!fnArg) {
							return context.error(stepNode, "pipe-map-missing-argument");
						}
						const transformedFn = await DCommon.asyncPipe(
							context.transform(fnArg, expressionTransformers.value),
							DEither.unwrapRight,
						);
						if (DEither.isLeft(transformedFn)) {
							return transformedFn;
						}

						let hasIndexParam = false;
						if (TsAST.isArrowFunction(fnArg) || TsAST.isFunctionExpression(fnArg)) {
							hasIndexParam = fnArg.parameters.length >= 2;
						} else {
							const fnType = await typeChecker.getTypeAtLocation(fnArg);
							const fnSigs = await typeChecker.getSignaturesOfType(fnType, SignatureKind.Call);
							const firstSig = fnSigs[0];
							if (firstSig) {
								const sigParams = await firstSig.getParameters();
								hasIndexParam = sigParams.length >= 2;
							}
						}
						const mapFnId = hasIndexParam ? arrayMapIndexFunctionIdentifier : arrayMapFunctionIdentifier;

						beforeStatements.push(...(transformedFn.before ?? []));
						const nextVar = context.generateIdentifier();
						beforeStatements.push(
							GoAST.createShortVariableDeclarationStatement({
								identifier: nextVar,
								initializer: GoAST.createCallExpression({
									callee: GoAST.createSelectorExpression({
										target: context.registerSharedDependency(arrayMapDependency.value),
										identifier: mapFnId,
									}),
									arguments: [currentExpr, transformedFn.result],
								}),
							}),
						);
						currentExpr = nextVar;
						continue;
					}

					// DString.test(regex) dans pipe
					if (exportName === "test" && entry.startsWith("dist/string/") && stepNode.arguments.length === 1) {
						const [regexArg] = stepNode.arguments;
						if (!regexArg) {
							return context.error(stepNode, "pipe-test-missing-argument");
						}

						context.file.imports.add(
							GoAST.createImportDeclaration({ path: "regexp" }),
						);

						let rawPattern = "";
						let flags = "";
						if (TsAST.isRegularExpressionLiteral(regexArg)) {
							const text = regexArg.text;
							const lastSlash = text.lastIndexOf("/");
							if (lastSlash > 0) {
								rawPattern = text.slice(1, lastSlash);
								flags = text.slice(lastSlash + 1);
							} else {
								rawPattern = text;
							}
						} else if (TsAST.isStringLiteral(regexArg)) {
							rawPattern = regexArg.text;
						}

						let prefix = "";
						if (flags.includes("i")) prefix += "i";
						if (flags.includes("m")) prefix += "m";
						if (flags.includes("s")) prefix += "s";
						const goPattern = (prefix ? `(?${prefix})` : "") + rawPattern;

						const reIdent = context.generateIdentifier();
						context.file.declarations.add(
							GoAST.createVariableDeclarationInitialized({
								identifier: reIdent,
								initializer: GoAST.createCallExpression({
									callee: GoAST.createSelectorExpression({
										target: GoAST.createIdentifier("regexp"),
										identifier: GoAST.createIdentifier("MustCompile"),
									}),
									arguments: [GoAST.createStringLiteral({ value: goPattern })],
								}),
							}),
						);

						const nextVar = context.generateIdentifier();
						beforeStatements.push(
							GoAST.createShortVariableDeclarationStatement({
								identifier: nextVar,
								initializer: GoAST.createCallExpression({
									callee: GoAST.createSelectorExpression({
										target: reIdent,
										identifier: GoAST.createIdentifier("MatchString"),
									}),
									arguments: [currentExpr],
								}),
							}),
						);
						currentExpr = nextVar;
						continue;
					}
				}
			}
		}

		// Appel callable standard (identifier, arrow function, property access)
		const prevArg = node.arguments[stepIndex - 1];
		if (!prevArg) {
			return context.error(node, "pipe-missing-prev-argument");
		}
		const prevType = await typeChecker.getTypeAtLocation(prevArg);
		const invoked = await DCommon.asyncPipe(
			invokeCallable(stepNode, currentExpr, context, prevType),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(invoked)) {
			return context.error(stepNode, "pipe-step-callable-error");
		}

		beforeStatements.push(...invoked.before);
		const nextVar = context.generateIdentifier();
		beforeStatements.push(
			GoAST.createShortVariableDeclarationStatement({
				identifier: nextVar,
				initializer: invoked.result,
			}),
		);
		currentExpr = nextVar;
	}

	return context.success({
		before: beforeStatements,
		result: currentExpr,
	});
}

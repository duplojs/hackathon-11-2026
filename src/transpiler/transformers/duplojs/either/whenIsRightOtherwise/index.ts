import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind } from "typescript/async";
import type { BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { transformCheckerType } from "../../../type/fromChecker";
import {
	eitherDependency,
	eitherTypeIdentifier,
	getValueMethodIdentifier,
	isRightMethodIdentifier,
} from "../sharedDependency";
import { invokeCallable, getEitherRightValueType } from "../../callable";

export async function whenIsRightOtherwiseExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (!TsAST.isCallExpression(node)) {
		return context.notSupport();
	}

	const { typeChecker } = context.transpilation;

	// Forme data-first : DEither.whenIsRightOtherwise(either, onRight, onLeft)
	if (node.arguments.length === 3) {
		const [eitherArg, onRightArg, onLeftArg] = node.arguments;
		if (!eitherArg || !onRightArg || !onLeftArg) {
			return context.error(node, "whenIsRightOtherwise-missing-arguments");
		}

		const transformedEither = await DCommon.asyncPipe(
			context.transform(eitherArg, expressionTransformers.value),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(transformedEither)) {
			return transformedEither;
		}

		const eitherVar = context.generateIdentifier();
		const eitherDecl = GoAST.createShortVariableDeclarationStatement({
			identifier: eitherVar,
			initializer: transformedEither.result,
		});

		// Résolution de l'argument à passer à onRightArg
		const eitherType = await typeChecker.getTypeAtLocation(eitherArg);
		const rightValueType = await getEitherRightValueType(eitherType, eitherArg, context);

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
			return context.error(node, {
				message: "whenIsRightOtherwise-onRight-error",
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
			return context.error(node, "whenIsRightOtherwise-onLeft-error");
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

		return context.success({
			before: [
				...(transformedEither.before ?? []),
				eitherDecl,
				resultVarDecl,
				ifStmt,
			],
			result: resultVar,
		});
	}

	// Forme curriée : DEither.whenIsRightOtherwise(onRight, onLeft)
	if (node.arguments.length === 2) {
		const [onRightArg, onLeftArg] = node.arguments;
		if (!onRightArg || !onLeftArg) {
			return context.error(node, "whenIsRightOtherwise-curried-missing-arguments");
		}

		const eitherPkg = context.registerSharedDependency(eitherDependency.value);
		const eitherTypeRef = GoAST.createPackageTypeReference({
			packageName: eitherPkg,
			identifier: eitherTypeIdentifier,
		});

		const itemIdent = context.generateIdentifier();

		// Déterminer le type de la valeur Right attendue
		let rightValueType: GoAST.Type | GoAST.TypeReference = GoAST.builtinTypeReferences.float64;
		if (TsAST.isArrowFunction(onRightArg) && onRightArg.parameters.length > 0) {
			const [param] = onRightArg.parameters;
			if (param) {
				const paramType = await typeChecker.getTypeAtLocation(param);
				const transformed = await DCommon.asyncPipe(
					transformCheckerType(paramType, param, context),
					DEither.unwrapRight,
				);
				if (!DEither.isLeft(transformed)) {
					rightValueType = transformed.result;
				}
			}
		}

		const argExpr = GoAST.createTypeAssertionExpression({
			target: GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: itemIdent,
					identifier: getValueMethodIdentifier,
				}),
				arguments: [],
			}),
			typeReference: rightValueType,
		});

		const invokedRight = await DCommon.asyncPipe(
			invokeCallable(onRightArg, argExpr, context),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(invokedRight)) {
			return context.error(node, "whenIsRightOtherwise-curried-onRight-error");
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
			invokeCallable(onLeftArg, leftExpectsArg ? itemIdent : undefined, context),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(invokedLeft)) {
			return context.error(node, "whenIsRightOtherwise-curried-onLeft-error");
		}

		let returnType: GoAST.Type | GoAST.TypeReference = GoAST.builtinTypeReferences.any;
		const nodeType = await typeChecker.getTypeAtLocation(node);
		const nodeSigs = await typeChecker.getSignaturesOfType(nodeType, SignatureKind.Call);
		const firstNodeSig = nodeSigs[0];
		if (firstNodeSig) {
			const retType = await typeChecker.getReturnTypeOfSignature(firstNodeSig);
			const transformed = await DCommon.asyncPipe(
				transformCheckerType(retType, node, context),
				DEither.unwrapRight,
			);
			if (!DEither.isLeft(transformed)) {
				returnType = transformed.result;
			}
		}
		if (returnType === GoAST.builtinTypeReferences.any) {
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
					returnType = transformed.result;
				}
			}
		}
		if (DModeling.hasTagValue(returnType, "[node][type]array")) {
			const arr = returnType as GoAST.ArrayType;
			if (DModeling.hasTagValue(arr.length, "[node][expression]literal-integer") && (arr.length as GoAST.IntegerLiteral).value === 1n) {
				returnType = GoAST.createSliceType({ elementType: arr.elementType });
			}
		}

		const resultVar = context.generateIdentifier();
		const resultVarDecl = GoAST.createVariableDeclarationZeroValue({
			identifier: resultVar,
			typeReference: returnType,
		});

		const ifStmt = GoAST.createIfStatement({
			condition: GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: itemIdent,
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

		return context.success({
			result: GoAST.createFunctionLiteral({
				arguments: [
					GoAST.createFunctionArgument({
						identifier: itemIdent,
						type: eitherTypeRef,
					}),
				],
				returnTypes: [returnType],
				body: GoAST.createBlockStatement({
					statements: [
						resultVarDecl,
						ifStmt,
						GoAST.createReturnStatement({
							values: DCommon.cast([resultVar]),
						}),
					],
				}),
			}),
		});
	}

	return context.error(node, "whenIsRightOtherwise-invalid-arguments");
}

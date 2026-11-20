import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind } from "typescript/async";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { typeTransformers } from "../../../type";
import { transformCheckerType } from "../../../type/fromChecker";
import {
	arrayMapDependency,
	arrayMapFunctionIdentifier,
	arrayMapIndexFunctionIdentifier,
} from "./sharedDependency";

async function isTwoParamCallback(fnNode: TsAST.Node, context: BuildContext): Promise<boolean> {
	if (TsAST.isArrowFunction(fnNode) || TsAST.isFunctionExpression(fnNode)) {
		return fnNode.parameters.length >= 2;
	}
	const fnType = await context.transpilation.typeChecker.getTypeAtLocation(fnNode);
	const sigs = await context.transpilation.typeChecker.getSignaturesOfType(fnType, SignatureKind.Call);
	const firstSig = sigs[0];
	if (firstSig) {
		const params = await firstSig.getParameters();
		return params.length >= 2;
	}
	return false;
}

export async function mapExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (TsAST.isCallExpression(node)) {
		const { typeChecker } = context.transpilation;

		if (node.arguments.length === 2) {
			const [itemsArg, fnArg] = node.arguments;
			if (!itemsArg || !fnArg) {
				return context.error(node, "map-missing-arguments");
			}

			const transformedItems = await DCommon.asyncPipe(
				context.transform(itemsArg, expressionTransformers.value),
				DEither.unwrapRight,
			);
			if (DEither.isLeft(transformedItems)) {
				return transformedItems;
			}

			let itemsExpr = transformedItems.result;
			const itemsType = await typeChecker.getTypeAtLocation(itemsArg);
			const itemsTypeNode = await typeChecker.typeToTypeNode(itemsType, itemsArg);
			if (itemsTypeNode && TsAST.isTupleTypeNode(itemsTypeNode)) {
				const tupleLen = itemsTypeNode.elements.length;
				if (tupleLen >= 2 && tupleLen <= 8) {
					const firstElem = itemsTypeNode.elements[0];
					let sliceElemType: GoAST.SliceElementType = GoAST.builtinTypeReferences.any;
					if (firstElem) {
						const transformedElem = await DCommon.asyncPipe(
							context.transform(firstElem, typeTransformers.value),
							DEither.unwrapRight,
						);
						if (!DEither.isLeft(transformedElem)) {
							sliceElemType = transformedElem.result;
						}
					}
					const tupleElements: GoAST.Expression[] = [];
					for (let i = 0; i < tupleLen; i++) {
						tupleElements.push(
							GoAST.createSelectorExpression({
								target: transformedItems.result,
								identifier: GoAST.createIdentifier(`V${i}`),
							}),
						);
					}
					itemsExpr = GoAST.createSliceLiteral({
						typeReference: GoAST.createSliceType({
							elementType: sliceElemType,
						}),
						elements: tupleElements,
					});
				}
			}

			const transformedFn = await DCommon.asyncPipe(
				context.transform(fnArg, expressionTransformers.value),
				DEither.unwrapRight,
			);
			if (DEither.isLeft(transformedFn)) {
				return transformedFn;
			}

			const hasIndex = await isTwoParamCallback(fnArg, context);
			const mapFnId = hasIndex ? arrayMapIndexFunctionIdentifier : arrayMapFunctionIdentifier;

			return context.success({
				before: [
					...(transformedItems.before ?? []),
					...(transformedFn.before ?? []),
				],
				result: GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: context.registerSharedDependency(arrayMapDependency.value),
						identifier: mapFnId,
					}),
					arguments: [itemsExpr, transformedFn.result],
				}),
			});
		}

		if (node.arguments.length === 1) {
			// Curried DArray.map(fn)
			const [fnArg] = node.arguments;
			if (!fnArg) {
				return context.error(node, "map-missing-arguments");
			}
			const transformedFn = await DCommon.asyncPipe(
				context.transform(fnArg, expressionTransformers.value),
				DEither.unwrapRight,
			);
			if (DEither.isLeft(transformedFn)) {
				return transformedFn;
			}

			const hasIndex = await isTwoParamCallback(fnArg, context);
			const mapFnId = hasIndex ? arrayMapIndexFunctionIdentifier : arrayMapFunctionIdentifier;

			// Résolution des types d'entrée et de sortie via le typeChecker
			let itemType: GoAST.SliceElementType = GoAST.builtinTypeReferences.any;
			let retItemType: GoAST.SliceElementType = GoAST.builtinTypeReferences.any;

			const fnType = await typeChecker.getTypeAtLocation(fnArg);
			const fnSigs = await typeChecker.getSignaturesOfType(fnType, SignatureKind.Call);
			const firstSig = fnSigs[0];
			if (firstSig) {
				const sigParams = await firstSig.getParameters();
				const firstParam = sigParams[0];
				if (firstParam) {
					const paramType = await typeChecker.getTypeOfSymbolAtLocation(firstParam, fnArg);
					const transformedParam = await DCommon.asyncPipe(
						transformCheckerType(paramType, fnArg, context),
						DEither.unwrapRight,
					);
					if (!DEither.isLeft(transformedParam)) {
						itemType = transformedParam.result;
					}
				}

				const fnRetType = await typeChecker.getReturnTypeOfSignature(firstSig);
				const transformedRet = await DCommon.asyncPipe(
					transformCheckerType(fnRetType, fnArg, context),
					DEither.unwrapRight,
				);
				if (!DEither.isLeft(transformedRet)) {
					retItemType = transformedRet.result;
				}
			}

			// Returns typed func(items []T) []R
			const itemsIdent = GoAST.createIdentifier("items");
			return context.success({
				before: transformedFn.before ?? [],
				result: GoAST.createFunctionLiteral({
					arguments: [
						GoAST.createFunctionArgument({
							identifier: itemsIdent,
							type: GoAST.createSliceType({ elementType: itemType }),
						}),
					],
					returnTypes: [GoAST.createSliceType({ elementType: retItemType })],
					body: GoAST.createBlockStatement({
						statements: [
							GoAST.createReturnStatement({
								values: [
									GoAST.createCallExpression({
										callee: GoAST.createSelectorExpression({
											target: context.registerSharedDependency(arrayMapDependency.value),
											identifier: mapFnId,
										}),
										arguments: [itemsIdent, transformedFn.result],
									}),
								],
							}),
						],
					}),
				}),
			});
		}
	}

	return context.success({
		result: GoAST.createSelectorExpression({
			target: context.registerSharedDependency(arrayMapDependency.value),
			identifier: arrayMapFunctionIdentifier,
		}),
	});
}

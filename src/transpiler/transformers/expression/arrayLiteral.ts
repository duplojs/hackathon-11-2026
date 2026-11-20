import { TsAST } from "@typescript";
import { GoAST } from "@go";
import * as DModeling from "@duplojs/lang/modeling";
import { createTransformer, type Transformer, type TransformationSuccessPayload } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from ".";
import { transformCheckerType } from "../type/fromChecker";
import { tupleSharedDependency } from "../type/tupleSharedDependency";

export const arrayLiteralTransformer: Transformer<
	GoAST.SliceLiteral | GoAST.ArrayLiteral | GoAST.CallExpression
> = createTransformer(
	async(node, context) => {
		if (!TsAST.isArrayLiteralExpression(node)) {
			return context.notSupport();
		}

		const { typeChecker } = context.transpilation;

		const elementsResult = await DCommon.asyncPipe(
			node.elements,
			DArray.map(async(el) => DCommon.asyncPipe(
				context.transform(el, expressionTransformers.value),
				DEither.unwrapRight,
			)),
			DCommon.promiseAll,
		);

		for (const el of elementsResult) {
			if (DEither.isLeft(el)) {
				return el;
			}
		}

		const successfulElements = elementsResult as readonly TransformationSuccessPayload<GoAST.Expression>[];
		const before = DArray.flatMap(successfulElements, (item) => item.before ?? []);
		const elementExprs = DArray.map(successfulElements, (item) => item.result);

		const type = await typeChecker.getTypeAtLocation(node);
		const tsTypeNode = await typeChecker.typeToTypeNode(type, node);
		if (tsTypeNode && TsAST.isTupleTypeNode(tsTypeNode)) {
			const count = node.elements.length;
			if (count >= 2 && count <= 8) {
				const tuplePkg = context.registerSharedDependency(tupleSharedDependency.value);
				return context.success({
					before,
					result: GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target: tuplePkg,
							identifier: GoAST.createIdentifier(`Tuple${count}Of`),
						}),
						arguments: elementExprs,
					}),
				});
			}
		}

		const typeNode = await DCommon.asyncPipe(
			transformCheckerType(type, node, context),
			DEither.unwrapRight,
		);

		if (!DEither.isLeft(typeNode)) {
			const resolvedType = typeNode.result;
			if (DModeling.hasTagValue(resolvedType, "[node][type]array")) {
				if (DModeling.hasTagValue(resolvedType.length, "[node][expression]literal-integer") && (resolvedType.length as GoAST.IntegerLiteral).value === 1n) {
					return context.success({
						before,
						result: GoAST.createSliceLiteral({
							typeReference: GoAST.createSliceType({
								elementType: resolvedType.elementType,
							}),
							elements: elementExprs,
						}),
					});
				}
				return context.success({
					before,
					result: GoAST.createArrayLiteral({
						typeReference: resolvedType,
						elements: elementExprs,
					}),
				});
			}
			if (DModeling.hasTagValue(resolvedType, "[node][type]slice")) {
				return context.success({
					before,
					result: GoAST.createSliceLiteral({
						typeReference: resolvedType,
						elements: elementExprs,
					}),
				});
			}
		}

		const [firstElement] = node.elements;
		if (!firstElement) {
			return context.error(node, "array-literal-cannot-determine-type");
		}
		const firstElType = await DCommon.asyncPipe(
			transformCheckerType(await typeChecker.getTypeAtLocation(firstElement), firstElement, context),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(firstElType)) {
			return context.error(firstElement, "array-literal-element-type-error");
		}
		const elemType: GoAST.Type | GoAST.TypeReference = firstElType.result;

		return context.success({
			before,
			result: GoAST.createSliceLiteral({
				typeReference: GoAST.createSliceType({
					elementType: elemType,
				}),
				elements: elementExprs,
			}),
		});
	},
);

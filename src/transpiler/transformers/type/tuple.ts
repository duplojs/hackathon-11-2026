import { GoAST } from "@go";
import { createTransformer, type Transformer, type TransformationSuccessPayload } from "@transformer";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { typeTransformers } from ".";
import { tupleSharedDependency } from "./tupleSharedDependency";

export const tupleTypeTransformer: Transformer<GoAST.SliceType | GoAST.GenericTypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTupleTypeNode(node)) {
			return context.notSupport();
		}

		if (node.elements.length === 0) {
			return context.success({
				result: GoAST.createSliceType({
					elementType: GoAST.builtinTypeReferences.any,
				}),
			});
		}

		const elementResults = await DCommon.asyncPipe(
			node.elements,
			DArray.map(async(elementNode) => DCommon.asyncPipe(
				context.transform(elementNode, typeTransformers.value),
				DEither.unwrapRight,
			)),
			DCommon.promiseAll,
		);

		for (const res of elementResults) {
			if (DEither.isLeft(res)) {
				return res;
			}
		}

		type TypePayload = TransformationSuccessPayload<GoAST.Type | GoAST.TypeReference>;
		const successfulResults = elementResults as readonly TypePayload[];
		const before = DArray.flatMap(successfulResults, (res) => res.before ?? []);

		const count = node.elements.length;
		if (count >= 2 && count <= 8) {
			const tuplePkg = context.registerSharedDependency(tupleSharedDependency.value);
			return context.success({
				before,
				result: GoAST.createGenericTypeReference({
					typeReference: GoAST.createPackageTypeReference({
						packageName: tuplePkg,
						identifier: GoAST.createIdentifier(`Tuple${count}`),
					}),
					typeArguments: successfulResults.map((item) => item.result) as never,
				}),
			});
		}

		const firstType = successfulResults[0]?.result ?? GoAST.builtinTypeReferences.any;
		return context.success({
			before,
			result: GoAST.createSliceType({
				elementType: firstType,
			}),
		});
	},
);

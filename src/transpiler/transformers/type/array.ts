import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";

// `T[]` (seule forme produite par typeToTypeNode pour un type inféré), et
// `Array<T>` / `ReadonlyArray<T>` écrits dans une annotation : []T.
// Array<T> est reconnu par le checker (isArrayType), pas par son nom, pour
// ne pas confondre avec un type utilisateur qui s'appellerait Array.
export const arrayTypeTransformer: Transformer<GoAST.SliceType> = createTransformer(
	async(node, context) => {
		const elementNode = await DCommon.justExec(async() => {
			if (TsAST.isArrayTypeNode(node)) {
				return node.elementType;
			}

			if (
				!TsAST.isTypeReferenceNode(node)
				|| node.pos < 0
				|| !node.typeArguments
				|| !DArray.lengthEqual(node.typeArguments, 1)
			) {
				return undefined;
			}

			const { typeChecker } = context.transpilation;
			const isArray = await typeChecker.isArrayType(await typeChecker.getTypeFromTypeNode(node));

			return isArray ? DArray.first(node.typeArguments) : undefined;
		});

		if (!elementNode) {
			return context.notSupport();
		}

		const elementType = await DCommon.asyncPipe(
			context.transform(elementNode, typeTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(elementType)) {
			return elementType;
		}

		return context.success({
			before: elementType.before,
			result: GoAST.createSliceType({
				elementType: elementType.result,
			}),
		});
	},
);

import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import type { GoType } from "./checkerType";

// Un tableau TypeScript (`T[]`, `readonly T[]`) a une longueur variable : il devient une slice Go.
// `readonly` n'est qu'une contrainte de compilation, il n'a pas d'effet sur la représentation.
export const arrayTypeTransformer: Transformer<GoType> = createTransformer(
	async(node, context) => {
		if (
			TsAST.isTypeOperatorNode(node)
			&& node.operator === TsAST.SyntaxKind.ReadonlyKeyword
		) {
			return context.transform(node.type, typeTransformers.value);
		}

		if (!TsAST.isArrayTypeNode(node)) {
			return context.notSupport();
		}

		const elementType = await DCommon.asyncPipe(
			context.transform(node.elementType, typeTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(elementType)) {
			return elementType;
		}

		if (!DArray.lengthEqual(elementType.before, 0)) {
			return context.error(node, "un-support-before-on-array-element-type");
		}

		return context.success({
			result: GoAST.createSliceType({
				elementType: elementType.result,
			}),
		});
	},
);

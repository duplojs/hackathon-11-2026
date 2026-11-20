import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { typeTransformers } from ".";

export const arrayTypeTransformer: Transformer<GoAST.SliceType> = createTransformer(
	async(node, context) => {
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

		return context.success({
			before: elementType.before,
			result: GoAST.createSliceType({
				elementType: elementType.result,
			}),
		});
	},
);

import { TsAST } from "@typescript";
import { type Transformer, createTransformer } from "@transformer";
import type { GoAST } from "@go";
import * as DEither from "@duplojs/lang/either";
import { typeTransformers } from ".";

export const intersectionTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIntersectionTypeNode(node)) {
			return context.notSupport();
		}

		for (const member of node.types) {
			const transformed = await context.transform(member, typeTransformers.value);
			if (DEither.isRight(transformed)) {
				return transformed;
			}
		}

		return context.notSupport();
	},
);

import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSTypeTransformers } from "../duplojs";
import { sharedTypeTransformers } from "../shared";
import { float64TypeTransformer } from "./float";
import { parenthesizedTypeTransformer } from "./parenthesized";
import { stringTypeTransformer } from "./string";
import { booleanTypeTransformer } from "./boolean";
import { numberLiteralTypeTransformer } from "./numberLiteral";
import { mixedEitherUnionTypeTransformer } from "./mixedEitherUnion";
import { arrayTypeTransformer } from "./array";
import { sameTypeUnionTransformer } from "./sameTypeUnion";
import { stringLiteralTypeTransformer } from "./stringLiteral";
import { brandedIntersectionTypeTransformer } from "./brandedIntersection";

export const typeTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Type | GoAST.TypeReference>[] => [
		...duploJSTypeTransformers.value,
		...sharedTypeTransformers.value,
		float64TypeTransformer,
		stringTypeTransformer,
		booleanTypeTransformer,
		numberLiteralTypeTransformer,
		stringLiteralTypeTransformer,
		brandedIntersectionTypeTransformer,
		parenthesizedTypeTransformer,
		arrayTypeTransformer,
		mixedEitherUnionTypeTransformer,
		sameTypeUnionTransformer,
	],
);

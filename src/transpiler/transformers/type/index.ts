import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSTypeTransformers } from "../duplojs";
import { sharedTypeTransformers } from "../shared";
import { float64TypeTransformer } from "./float";
import { stringTypeTransformer } from "./string";
import { booleanTypeTransformer } from "./boolean";
import { literalTypeTransformer } from "./literal";
import { parenthesizedTypeTransformer } from "./parenthesized";
import { unionTypeTransformer } from "./union";
import { arrayTypeTransformer } from "./array";
import { tupleTypeTransformer } from "./tuple";
import { intersectionTypeTransformer } from "./intersection";
import { functionTypeTransformer } from "./function";
import { nullishTypeTransformer } from "./nullish";
import { promiseTypeTransformer } from "./promise";

export * from "./checkerType";
export * from "./union";

export const typeTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Type | GoAST.TypeReference>[] => [
		...duploJSTypeTransformers.value,
		...sharedTypeTransformers.value,
		float64TypeTransformer,
		stringTypeTransformer,
		booleanTypeTransformer,
		literalTypeTransformer,
		parenthesizedTypeTransformer,
		unionTypeTransformer,
		arrayTypeTransformer,
		tupleTypeTransformer,
		intersectionTypeTransformer,
		functionTypeTransformer,
		nullishTypeTransformer,
		promiseTypeTransformer,
	],
);

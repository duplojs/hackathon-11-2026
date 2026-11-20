import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSTypeTransformers } from "../duplojs";
import { sharedTypeTransformers } from "../shared";
import { float64TypeTransformer } from "./float";
import { parenthesizedTypeTransformer } from "./parenthesized";
import { stringTypeTransformer } from "./string";
import { arrayTypeTransformer } from "./array";
import { tupleTypeTransformer } from "./tuple";
import { nullTypeTransformer } from "./null";
import { undefinedTypeTransformer } from "./undefined";
import { typeOperatorTransformer } from "./typeOperator";
import { promiseTypeTransformer } from "./promise";
import { intersectionTypeTransformer } from "./intersection";

export const typeTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Type | GoAST.TypeReference>[] => [
		...duploJSTypeTransformers.value,
		...sharedTypeTransformers.value,
		float64TypeTransformer,
		parenthesizedTypeTransformer,
		stringTypeTransformer,
		arrayTypeTransformer,
		tupleTypeTransformer,
		nullTypeTransformer,
		undefinedTypeTransformer,
		typeOperatorTransformer,
		promiseTypeTransformer,
		intersectionTypeTransformer,
	],
);

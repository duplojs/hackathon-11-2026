import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSTypeTransformers } from "../duplojs";
import { sharedTypeTransformers } from "../shared";
import { float64TypeTransformer } from "./float";

export const typeTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Type>[] => [
		...duploJSTypeTransformers.value,
		...sharedTypeTransformers.value,
		float64TypeTransformer,
	],
);

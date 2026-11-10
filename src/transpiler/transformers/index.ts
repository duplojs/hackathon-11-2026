import * as DCommon from "@duplojs/lang/common";
import { declarationTransformers } from "./declaration";
import { statementTransformers } from "./statement";

export * from "./declaration";
export * from "./expression";
export * from "./helpers";
export * from "./statement";
export * from "./type";

export const sourceFileTransformers = DCommon.memo(() => [
	...declarationTransformers,
	...statementTransformers.value,
]);

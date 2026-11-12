import * as DCommon from "@duplojs/lang/common";
import { declarationTransformers } from "./declaration";
import { statementTransformers } from "./statement";

export * from "./declaration";
export * from "./duplojs";
export * from "./expression";
export * from "./shared";
export * from "./statement";
export * from "./type";

export const sourceFileTransformers = DCommon.memo(() => [
	...declarationTransformers.value,
	...statementTransformers.value,
]);

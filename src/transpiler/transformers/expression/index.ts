import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "../../factory";
import type * as GO from "@go";
import { duploJSExpressionTransformers } from "../duplojs";

export const expressionTransformers = DCommon.memo(
	(): readonly Transformer<GO.AST.Expression>[] => [...duploJSExpressionTransformers.value],
);

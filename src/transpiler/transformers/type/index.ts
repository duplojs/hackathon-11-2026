import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "../../factory";
import type * as GO from "@go";
import { duploJSTypeTransformers } from "../duplojs";

export const typeTransformers = DCommon.memo(
	(): readonly Transformer<GO.AST.Type>[] => [...duploJSTypeTransformers.value],
);

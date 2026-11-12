import * as DCommon from "@duplojs/lang/common";
import type * as GO from "@go";
import { type Transformer } from "../../factory";
import { duploJSStatementTransformers } from "../duplojs";

export const statementTransformers = DCommon.memo(
	(): readonly Transformer<GO.AST.Statement>[] => [...duploJSStatementTransformers.value],
);

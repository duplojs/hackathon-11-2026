import * as DCommon from "@duplojs/lang/common";
import type { GoAST } from "@go";
import { type Transformer } from "@transformer";
import { duploJSStatementTransformers } from "../duplojs";

export const statementTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Statement>[] => [...duploJSStatementTransformers.value],
);

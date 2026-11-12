import * as DCommon from "@duplojs/lang/common";
import type { GoAST } from "@go";
import { type Transformer } from "@transformer";
import { duploJSStatementTransformers } from "../duplojs";
import { sharedStatementTransformers } from "../shared";
import { blockStatementTransformer } from "./block";
import { returnStatementTransformer } from "./return";

export const statementTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Statement>[] => [
		...duploJSStatementTransformers.value,
		...sharedStatementTransformers.value,
		blockStatementTransformer,
		returnStatementTransformer,
	],
);

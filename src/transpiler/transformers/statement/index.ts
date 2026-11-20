import * as DCommon from "@duplojs/lang/common";
import type { GoAST } from "@go";
import { type Transformer } from "@transformer";
import { duploJSStatementTransformers } from "../duplojs";
import { sharedStatementTransformers } from "../shared";
import { blockStatementTransformer } from "./block";
import { expressionStatementTransformer } from "./expression";
import { ifStatementTransformer } from "./if";
import { returnStatementTransformer } from "./return";
import { variableStatementTransformer } from "./variable";

export const statementTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Statement>[] => [
		...duploJSStatementTransformers.value,
		expressionStatementTransformer,
		...sharedStatementTransformers.value,
		blockStatementTransformer,
		returnStatementTransformer,
		variableStatementTransformer,
		ifStatementTransformer,
	],
);

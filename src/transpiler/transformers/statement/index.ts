import * as DCommon from "@duplojs/lang/common";
import type { GoAST } from "@go";
import { type Transformer } from "@transformer";
import { duploJSStatementTransformers } from "../duplojs";
import { sharedStatementTransformers } from "../shared";
import { blockStatementTransformer } from "./block";
import { ifStatementTransformer } from "./if";
import { returnStatementTransformer } from "./return";
import { variableStatementTransformer } from "./variable";
import { assignmentStatementTransformer } from "./assignment";
import {
	forOfStatementTransformer,
	forStatementTransformer,
	jumpStatementTransformer,
	whileStatementTransformer,
} from "./loop";

export const statementTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Statement>[] => [
		...duploJSStatementTransformers.value,
		assignmentStatementTransformer,
		...sharedStatementTransformers.value,
		blockStatementTransformer,
		ifStatementTransformer,
		returnStatementTransformer,
		variableStatementTransformer,
		forOfStatementTransformer,
		forStatementTransformer,
		whileStatementTransformer,
		jumpStatementTransformer,
	],
);

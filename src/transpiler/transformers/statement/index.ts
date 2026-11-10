import * as DCommon from "@duplojs/lang/common";
import { blockTransformer } from "./block";
import { expressionStatementTransformer } from "./expressionStatement";
import { returnStatementTransformer } from "./returnStatement";

export { blockTransformer, expressionStatementTransformer, returnStatementTransformer };

export const statementTransformers = DCommon.memo(() => [
	blockTransformer,
	returnStatementTransformer,
	expressionStatementTransformer,
]);

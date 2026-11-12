import * as DModeling from "@duplojs/lang/modeling";
import { type Statement, type StatementGroup } from "./base";

export interface BlockStatement extends DModeling.ObjectTagWithGroup<"block", StatementGroup> {
	statements: readonly Statement[];
}

export const createBlockStatement = DModeling.createTaggedObjectFactory<BlockStatement>(
	"[node][statement]block",
);

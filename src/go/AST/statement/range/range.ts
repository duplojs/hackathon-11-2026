import * as DModeling from "@duplojs/lang/modeling";
import { type StatementGroup, type BlockStatement } from "..";
import { type RangeBinding } from "./rangeBinding";
import { type Expression } from "../../expression";

export interface RangeStatement extends DModeling.ObjectTagWithGroup<"range", StatementGroup> {
	binding?: RangeBinding;
	expression: Expression;
	body: BlockStatement;
}

export const createRangeStatement = DModeling.createTaggedObjectFactory<
	RangeStatement
>("[node][statement]range");

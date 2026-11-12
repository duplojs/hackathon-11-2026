import * as DModeling from "@duplojs/lang/modeling";
import { type StatementGroup } from "./base";
import { type CallExpression } from "../expression";

export interface GoStatement extends DModeling.ObjectTagWithGroup<"go", StatementGroup> {
	call: CallExpression;
}

export const createGoStatement = DModeling.createTaggedObjectFactory<
	GoStatement
>("[node][statement]go");

export interface DeferStatement extends DModeling.ObjectTagWithGroup<"defer", StatementGroup> {
	call: CallExpression;
}

export const createDeferStatement = DModeling.createTaggedObjectFactory<
	DeferStatement
>("[node][statement]defer");

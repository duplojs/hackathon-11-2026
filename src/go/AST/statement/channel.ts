import * as DModeling from "@duplojs/lang/modeling";
import { type StatementGroup } from "./base";
import { type Expression } from "../expression";

export interface SendStatement extends DModeling.ObjectTagWithGroup<"send", StatementGroup> {
	channel: Expression;
	value: Expression;
}

export const sendStatement = DModeling.createTaggedObjectFactory<
	SendStatement
>("[node][statement]send");

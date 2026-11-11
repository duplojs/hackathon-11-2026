import * as DModeling from "@duplojs/lang/modeling";
import { type Expression } from "../expression/base";
import { type _Statement } from "./base";

export interface SendStatement extends _Statement<"send"> {
	channel: Expression;
	value: Expression;
}

export const sendStatement = DModeling.createTaggedObjectFactory<
	SendStatement
>("[node][statement]:send");

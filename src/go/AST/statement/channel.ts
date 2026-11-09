import { createFactory } from "../base";
import { type Expression } from "../expression/base";
import { type _Statement } from "./base";

export interface SendStatement extends _Statement<"send"> {
	channel: Expression;
	value: Expression;
}

export const sendStatement = createFactory<
	SendStatement
>("node-statement-send");

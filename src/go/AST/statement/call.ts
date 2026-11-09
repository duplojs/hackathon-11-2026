import { createFactory } from "../base";
import { type CallExpression } from "../expression/call";
import { type _Statement } from "./base";

export interface GoStatement extends _Statement<"go"> {
	call: CallExpression;
}

export const goStatement = createFactory<
	GoStatement
>("node-statement-go");

export interface DeferStatement extends _Statement<"defer"> {
	call: CallExpression;
}

export const deferStatement = createFactory<
	DeferStatement
>("node-statement-defer");

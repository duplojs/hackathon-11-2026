import * as DModeling from "@duplojs/lang/modeling";
import { type CallExpression } from "../expression/call";
import { type _Statement } from "./base";

export interface GoStatement extends _Statement<"go"> {
	call: CallExpression;
}

export const goStatement = DModeling.createTaggedObjectFactory<
	GoStatement
>("[node][statement]:go");

export interface DeferStatement extends _Statement<"defer"> {
	call: CallExpression;
}

export const deferStatement = DModeling.createTaggedObjectFactory<
	DeferStatement
>("[node][statement]:defer");

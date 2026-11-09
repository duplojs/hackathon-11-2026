import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier } from "../identifier";
import { type Expression } from "../expression/base";
import { type _Statement, type Statement } from "./base";

export interface ReturnStatement extends _Statement<"return"> {
	values: readonly Expression[];
}

export const returnStatement = DModeling.createTaggedObjectFactory<
	ReturnStatement
>("node-statement-return");

export interface BreakStatement extends _Statement<"break"> {
	label?: Identifier;
}

export const breakStatement = DModeling.createTaggedObjectFactory<
	BreakStatement
>("node-statement-break");

export interface ContinueStatement extends _Statement<"continue"> {
	label?: Identifier;
}

export const continueStatement = DModeling.createTaggedObjectFactory<
	ContinueStatement
>("node-statement-continue");

export interface GotoStatement extends _Statement<"goto"> {
	label: Identifier;
}

export const gotoStatement = DModeling.createTaggedObjectFactory<
	GotoStatement
>("node-statement-goto");

// La position d'un fallthrough et la portée des sauts sont vérifiées dans leur contexte Go.
export interface FallthroughStatement extends _Statement<"fallthrough"> {

}

export const fallthroughStatement = DModeling.createTaggedObjectFactory<
	FallthroughStatement
>("node-statement-fallthrough");

export interface LabeledStatement extends _Statement<"labeled"> {
	label: Identifier;
	statement: Statement;
}

export const labeledStatement = DModeling.createTaggedObjectFactory<
	LabeledStatement
>("node-statement-labeled");

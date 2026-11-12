import * as DModeling from "@duplojs/lang/modeling";
import { type Statement, type StatementGroup } from "./base";
import { type Identifier } from "../common";
import { type Expression } from "../expression";

export interface ReturnStatement extends DModeling.ObjectTagWithGroup<"return", StatementGroup> {
	values: readonly Expression[];
}

export const returnStatement = DModeling.createTaggedObjectFactory<
	ReturnStatement
>("[node][statement]return");

export interface BreakStatement extends DModeling.ObjectTagWithGroup<"break", StatementGroup> {
	label?: Identifier;
}

export const breakStatement = DModeling.createTaggedObjectFactory<
	BreakStatement
>("[node][statement]break");

export interface ContinueStatement extends DModeling.ObjectTagWithGroup<"continue", StatementGroup> {
	label?: Identifier;
}

export const continueStatement = DModeling.createTaggedObjectFactory<
	ContinueStatement
>("[node][statement]continue");

export interface GotoStatement extends DModeling.ObjectTagWithGroup<"goto", StatementGroup> {
	label: Identifier;
}

export const gotoStatement = DModeling.createTaggedObjectFactory<
	GotoStatement
>("[node][statement]goto");

// La position d'un fallthrough et la portée des sauts sont vérifiées dans leur contexte Go.
export interface FallthroughStatement extends DModeling.ObjectTagWithGroup<"fallthrough", StatementGroup> {

}

export const fallthroughStatement = DModeling.createTaggedObjectFactory<
	FallthroughStatement
>("[node][statement]fallthrough");

export interface LabeledStatement extends DModeling.ObjectTagWithGroup<"labeled", StatementGroup> {
	label: Identifier;
	statement: Statement;
}

export const labeledStatement = DModeling.createTaggedObjectFactory<
	LabeledStatement
>("[node][statement]labeled");

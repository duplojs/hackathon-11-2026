import * as DModeling from "@duplojs/lang/modeling";
import { type StatementGroup } from "..";
import { type SelectCase } from "./selectCase";
import { type DefaultCase } from "../../common";

export type SelectClause = SelectCase | DefaultCase;

export type SelectStatement = (
	| SelectStatementWithoutDefault
	| SelectStatementWithDefault
);

export interface SelectStatementWithoutDefault extends DModeling.ObjectTagWithGroup<"select-without-default", StatementGroup> {
	cases: readonly SelectCase[];
}

export const selectStatementWithoutDefault = DModeling.createTaggedObjectFactory<
	SelectStatementWithoutDefault
>("[node][statement]select-without-default");

export interface SelectStatementWithDefault extends DModeling.ObjectTagWithGroup<"select-with-default", StatementGroup> {
	casesBeforeDefault: readonly SelectCase[];
	defaultCase: DefaultCase;
	casesAfterDefault: readonly SelectCase[];
}

export const selectStatementWithDefault = DModeling.createTaggedObjectFactory<
	SelectStatementWithDefault
>("[node][statement]select-with-default");

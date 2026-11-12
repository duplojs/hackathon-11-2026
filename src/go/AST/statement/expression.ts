import * as DModeling from "@duplojs/lang/modeling";
import { type StatementGroup } from "./base";
import { type CallExpression, type ReceiveExpression } from "../expression";

export type StatementExpression = CallExpression | ReceiveExpression;

export interface ExpressionStatement extends DModeling.ObjectTagWithGroup<"expression", StatementGroup> {
	expression: StatementExpression;
}

export const createExpressionStatement = DModeling.createTaggedObjectFactory<
	ExpressionStatement
>("[node][statement]expression");

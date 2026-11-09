import * as DModeling from "@duplojs/lang/modeling";
import { type CallExpression } from "../expression/call";
import { type ReceiveExpression } from "../expression/operator";
import { type _Statement } from "./base";

export type StatementExpression = CallExpression | ReceiveExpression;

export interface ExpressionStatement extends _Statement<"expression"> {
	expression: StatementExpression;
}

export const expressionStatement = DModeling.createTaggedObjectFactory<
	ExpressionStatement
>("node-statement-expression");

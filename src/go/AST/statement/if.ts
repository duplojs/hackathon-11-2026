import * as DModeling from "@duplojs/lang/modeling";
import { type SimpleStatement, type StatementGroup } from "./base";
import { type BlockStatement } from "./block";
import { type Expression } from "../expression";

export interface IfStatement extends DModeling.ObjectTagWithGroup<"if", StatementGroup> {
	initializer?: SimpleStatement;
	condition: Expression;
	body: BlockStatement;
	elseBranch?: BlockStatement | IfStatement;
}

export const createIfStatement = DModeling.createTaggedObjectFactory<
	IfStatement
>("[node][statement]if");

import * as DModeling from "@duplojs/lang/modeling";
import { type SimpleStatement, type StatementGroup } from "./base";
import { type ExpressionStatement } from "./expression";
import { type BlockStatement } from "./block";
import { type AssignmentStatement, type CompoundAssignmentStatement } from "./assignment";
import { type SendStatement } from "./channel";
import { type Expression } from "../expression";

export type ForPostStatement = (
	| AssignmentStatement
	| CompoundAssignmentStatement
	| ExpressionStatement
	| SendStatement
);

export interface ForStatement extends DModeling.ObjectTagWithGroup<"for", StatementGroup> {
	initializer?: SimpleStatement;
	condition?: Expression;
	post?: ForPostStatement;
	body: BlockStatement;
}

export const forStatement = DModeling.createTaggedObjectFactory<
	ForStatement
>("[node][statement]for");

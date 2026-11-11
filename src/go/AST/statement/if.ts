import * as DModeling from "@duplojs/lang/modeling";
import { type Expression } from "../expression/base";
import { type _Statement, type SimpleStatement } from "./base";
import { type BlockStatement } from "./block";

export interface IfStatement extends _Statement<"if"> {
	initializer?: SimpleStatement;
	condition: Expression;
	body: BlockStatement;
	elseBranch?: BlockStatement | IfStatement;
}

export const ifStatement = DModeling.createTaggedObjectFactory<
	IfStatement
>("[node][statement]:if");

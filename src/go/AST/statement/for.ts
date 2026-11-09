import * as DModeling from "@duplojs/lang/modeling";
import { type _Node } from "../base";
import { type Identifier } from "../identifier";
import { type Expression } from "../expression/base";
import { type AssignmentStatement, type AssignmentTarget, type CompoundAssignmentStatement } from "./assignment";
import { type _Statement, type SimpleStatement } from "./base";
import { type BlockStatement } from "./block";
import { type SendStatement } from "./channel";
import { type ExpressionStatement } from "./expression";

export type ForPostStatement = (
	| AssignmentStatement
	| CompoundAssignmentStatement
	| ExpressionStatement
	| SendStatement
);

export interface ForStatement extends _Statement<"for"> {
	initializer?: SimpleStatement;
	condition?: Expression;
	post?: ForPostStatement;
	body: BlockStatement;
}

export const forStatement = DModeling.createTaggedObjectFactory<
	ForStatement
>("node-statement-for");

export interface RangeAssignment extends _Node<"range-assignment"> {
	key: AssignmentTarget;
	value?: AssignmentTarget;
}

export const rangeAssignment = DModeling.createTaggedObjectFactory<
	RangeAssignment
>("node-range-assignment");

export interface RangeDeclaration extends _Node<"range-declaration"> {
	key: Identifier;
	value?: Identifier;
}

export const rangeDeclaration = DModeling.createTaggedObjectFactory<
	RangeDeclaration
>("node-range-declaration");

export type RangeBinding = RangeAssignment | RangeDeclaration;

export interface RangeStatement extends _Statement<"range"> {
	binding?: RangeBinding;
	expression: Expression;
	body: BlockStatement;
}

export const rangeStatement = DModeling.createTaggedObjectFactory<
	RangeStatement
>("node-statement-range");

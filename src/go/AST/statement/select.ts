import { createFactory, type _Node } from "../base";
import { type Identifier } from "../identifier";
import { type ReceiveExpression } from "../expression/operator";
import { type AssignmentTarget } from "./assignment";
import { type _Statement, type Statement } from "./base";
import { type SendStatement } from "./channel";
import { type DefaultCase } from "./switch";

export interface SelectReceiveAssignment extends _Node<"select-receive-assignment"> {
	value: AssignmentTarget;
	ok?: AssignmentTarget;
	receive: ReceiveExpression;
}

export const selectReceiveAssignment = createFactory<
	SelectReceiveAssignment
>("node-select-receive-assignment");

export interface SelectReceiveDeclaration extends _Node<"select-receive-declaration"> {
	value: Identifier;
	ok?: Identifier;
	receive: ReceiveExpression;
}

export const selectReceiveDeclaration = createFactory<
	SelectReceiveDeclaration
>("node-select-receive-declaration");

export type SelectCommunication = (
	| SendStatement
	| ReceiveExpression
	| SelectReceiveAssignment
	| SelectReceiveDeclaration
);

export interface SelectCase extends _Node<"select-case"> {
	communication: SelectCommunication;
	statements: readonly Statement[];
}

export const selectCase = createFactory<
	SelectCase
>("node-select-case");

export type SelectClause = SelectCase | DefaultCase;

export type SelectStatement = (
	| SelectStatementWithoutDefault
	| SelectStatementWithDefault
);

export interface SelectStatementWithoutDefault extends _Statement<"select-without-default"> {
	cases: readonly SelectCase[];
}

export const selectStatementWithoutDefault = createFactory<
	SelectStatementWithoutDefault
>("node-statement-select-without-default");

export interface SelectStatementWithDefault extends _Statement<"select-with-default"> {
	casesBeforeDefault: readonly SelectCase[];
	defaultCase: DefaultCase;
	casesAfterDefault: readonly SelectCase[];
}

export const selectStatementWithDefault = createFactory<
	SelectStatementWithDefault
>("node-statement-select-with-default");

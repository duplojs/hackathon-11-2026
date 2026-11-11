import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type Identifier } from "../identifier";
import { type IndexExpression, type SelectorExpression } from "../expression/access";
import { type Expression } from "../expression/base";
import { type DereferenceExpression } from "../expression/operator";
import { type _Statement } from "./base";

export type AssignmentTarget = (
	| Identifier
	| SelectorExpression
	| IndexExpression
	| DereferenceExpression
);

export interface AssignmentStatement extends _Statement<"assignment"> {
	targets: readonly AssignmentTarget[] & DArray.MinElements<1>;
	values: readonly Expression[] & DArray.MinElements<1>;
}

export const assignmentStatement = DModeling.createTaggedObjectFactory<
	AssignmentStatement
>("[node][statement]:assignment");

export type CompoundAssignmentOperator = (
	| "+=" | "-=" | "*=" | "/=" | "%="
	| "&=" | "|=" | "^=" | "&^=" | "<<=" | ">>="
);

export interface CompoundAssignmentStatement extends _Statement<"assignment-compound"> {
	operator: CompoundAssignmentOperator;
	target: AssignmentTarget;
	value: Expression;
}

export const compoundAssignmentStatement = DModeling.createTaggedObjectFactory<
	CompoundAssignmentStatement
>("[node][statement]:assignment-compound");

export interface ShortVariableDeclarationStatement extends _Statement<"variable-short"> {
	identifier: Identifier;
	initializer: Expression;
}

export const shortVariableDeclarationStatement = DModeling.createTaggedObjectFactory<
	ShortVariableDeclarationStatement
>("[node][statement]:variable-short");

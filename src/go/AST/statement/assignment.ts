import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type StatementGroup } from "./base";
import { type Identifier } from "../common";
import { type Expression, type DereferenceExpression, type SelectorExpression, type IndexExpression } from "../expression";

export type AssignmentTarget = (
	| Identifier
	| SelectorExpression
	| IndexExpression
	| DereferenceExpression
);

export interface AssignmentStatement extends DModeling.ObjectTagWithGroup<"assignment", StatementGroup> {
	targets: readonly AssignmentTarget[] & DArray.MinElements<1>;
	values: readonly Expression[] & DArray.MinElements<1>;
}

export const assignmentStatement = DModeling.createTaggedObjectFactory<
	AssignmentStatement
>("[node][statement]assignment");

export type CompoundAssignmentOperator = (
	| "+=" | "-=" | "*=" | "/=" | "%="
	| "&=" | "|=" | "^=" | "&^=" | "<<=" | ">>="
);

export interface CompoundAssignmentStatement extends DModeling.ObjectTagWithGroup<"assignment-compound", StatementGroup> {
	operator: CompoundAssignmentOperator;
	target: AssignmentTarget;
	value: Expression;
}

export const compoundAssignmentStatement = DModeling.createTaggedObjectFactory<
	CompoundAssignmentStatement
>("[node][statement]assignment-compound");

export interface ShortVariableDeclarationStatement extends DModeling.ObjectTagWithGroup<"variable-short", StatementGroup> {
	identifier: Identifier;
	initializer: Expression;
}

export const shortVariableDeclarationStatement = DModeling.createTaggedObjectFactory<
	ShortVariableDeclarationStatement
>("[node][statement]variable-short");

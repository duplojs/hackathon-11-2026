import * as DModeling from "@duplojs/lang/modeling";
import { type SimpleStatement, type StatementGroup } from "..";
import { type Identifier, type DefaultCase } from "../../common";
import { type ExpressionSwitchCase } from "./expressionSwitchCase";
import { type TypeSwitchCase } from "./typeSwitchCase";
import { type Expression } from "../../expression";

export type ExpressionSwitchClause = ExpressionSwitchCase | DefaultCase;

export type ExpressionSwitchStatement = (
	| ExpressionSwitchStatementWithoutDefault
	| ExpressionSwitchStatementWithDefault
);

export interface ExpressionSwitchStatementWithoutDefault extends DModeling.ObjectTagWithGroup<"switch-expression-without-default", StatementGroup> {
	initializer?: SimpleStatement;
	expression?: Expression;
	cases: readonly ExpressionSwitchCase[];
}

export const expressionSwitchStatementWithoutDefault = DModeling.createTaggedObjectFactory<
	ExpressionSwitchStatementWithoutDefault
>("[node][statement]switch-expression-without-default");

export interface ExpressionSwitchStatementWithDefault extends DModeling.ObjectTagWithGroup<"switch-expression-with-default", StatementGroup> {
	initializer?: SimpleStatement;
	expression?: Expression;
	// Les deux listes préservent la position de l'unique default parmi les cas.
	casesBeforeDefault: readonly ExpressionSwitchCase[];
	defaultCase: DefaultCase;
	casesAfterDefault: readonly ExpressionSwitchCase[];
}

export const expressionSwitchStatementWithDefault = DModeling.createTaggedObjectFactory<
	ExpressionSwitchStatementWithDefault
>("[node][statement]switch-expression-with-default");

export type TypeSwitchClause = TypeSwitchCase | DefaultCase;

export type TypeSwitchStatement = (
	| TypeSwitchStatementWithoutDefault
	| TypeSwitchStatementWithDefault
);

export interface TypeSwitchStatementWithoutDefault extends DModeling.ObjectTagWithGroup<"switch-type-without-default", StatementGroup> {
	initializer?: SimpleStatement;
	// L'assertion spéciale .(type) appartient à la garde, jamais aux expressions ordinaires.
	expression: Expression;
	identifier?: Identifier;
	cases: readonly TypeSwitchCase[];
}

export const typeSwitchStatementWithoutDefault = DModeling.createTaggedObjectFactory<
	TypeSwitchStatementWithoutDefault
>("[node][statement]switch-type-without-default");

export interface TypeSwitchStatementWithDefault extends DModeling.ObjectTagWithGroup<"switch-type-with-default", StatementGroup> {
	initializer?: SimpleStatement;
	expression: Expression;
	identifier?: Identifier;
	casesBeforeDefault: readonly TypeSwitchCase[];
	defaultCase: DefaultCase;
	casesAfterDefault: readonly TypeSwitchCase[];
}

export const typeSwitchStatementWithDefault = DModeling.createTaggedObjectFactory<
	TypeSwitchStatementWithDefault
>("[node][statement]switch-type-with-default");

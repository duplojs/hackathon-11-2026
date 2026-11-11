import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type _Node } from "../base";
import { type Identifier } from "../identifier";
import { type Expression } from "../expression/base";
import { type NilLiteral } from "../expression/literal";
import { type Type } from "../type/base";
import { type TypeReference } from "../type/reference";
import { type _Statement, type SimpleStatement, type Statement } from "./base";

export interface ExpressionSwitchCase extends _Node<"switch-case-expression"> {
	expressions: readonly Expression[] & DArray.MinElements<1>;
	statements: readonly Statement[];
}

export const expressionSwitchCase = DModeling.createTaggedObjectFactory<
	ExpressionSwitchCase
>("[node]:switch-case-expression");

export interface DefaultCase extends _Node<"case-default"> {
	statements: readonly Statement[];
}

export const defaultCase = DModeling.createTaggedObjectFactory<
	DefaultCase
>("[node]:case-default");

export type ExpressionSwitchClause = ExpressionSwitchCase | DefaultCase;

export type ExpressionSwitchStatement = (
	| ExpressionSwitchStatementWithoutDefault
	| ExpressionSwitchStatementWithDefault
);

export interface ExpressionSwitchStatementWithoutDefault extends _Statement<"switch-expression-without-default"> {
	initializer?: SimpleStatement;
	expression?: Expression;
	cases: readonly ExpressionSwitchCase[];
}

export const expressionSwitchStatementWithoutDefault = DModeling.createTaggedObjectFactory<
	ExpressionSwitchStatementWithoutDefault
>("[node][statement]:switch-expression-without-default");

export interface ExpressionSwitchStatementWithDefault extends _Statement<"switch-expression-with-default"> {
	initializer?: SimpleStatement;
	expression?: Expression;
	// Les deux listes préservent la position de l'unique default parmi les cas.
	casesBeforeDefault: readonly ExpressionSwitchCase[];
	defaultCase: DefaultCase;
	casesAfterDefault: readonly ExpressionSwitchCase[];
}

export const expressionSwitchStatementWithDefault = DModeling.createTaggedObjectFactory<
	ExpressionSwitchStatementWithDefault
>("[node][statement]:switch-expression-with-default");

export type TypeSwitchCaseType = TypeReference | Type | NilLiteral;

export interface TypeSwitchCase extends _Node<"switch-case-type"> {
	types: readonly TypeSwitchCaseType[] & DArray.MinElements<1>;
	statements: readonly Statement[];
}

export const typeSwitchCase = DModeling.createTaggedObjectFactory<
	TypeSwitchCase
>("[node]:switch-case-type");

export type TypeSwitchClause = TypeSwitchCase | DefaultCase;

export type TypeSwitchStatement = (
	| TypeSwitchStatementWithoutDefault
	| TypeSwitchStatementWithDefault
);

export interface TypeSwitchStatementWithoutDefault extends _Statement<"switch-type-without-default"> {
	initializer?: SimpleStatement;
	// L'assertion spéciale .(type) appartient à la garde, jamais aux expressions ordinaires.
	expression: Expression;
	identifier?: Identifier;
	cases: readonly TypeSwitchCase[];
}

export const typeSwitchStatementWithoutDefault = DModeling.createTaggedObjectFactory<
	TypeSwitchStatementWithoutDefault
>("[node][statement]:switch-type-without-default");

export interface TypeSwitchStatementWithDefault extends _Statement<"switch-type-with-default"> {
	initializer?: SimpleStatement;
	expression: Expression;
	identifier?: Identifier;
	casesBeforeDefault: readonly TypeSwitchCase[];
	defaultCase: DefaultCase;
	casesAfterDefault: readonly TypeSwitchCase[];
}

export const typeSwitchStatementWithDefault = DModeling.createTaggedObjectFactory<
	TypeSwitchStatementWithDefault
>("[node][statement]:switch-type-with-default");

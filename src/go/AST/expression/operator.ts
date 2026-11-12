import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier } from "../common";
import { type Expression, type ExpressionGroup } from "./base";
import { type CompositeLiteral } from "./composite";
import { type SelectorExpression, type IndexExpression } from "./access";

export type UnaryOperator = "+" | "-" | "!" | "^";

export type BinaryOperator = (
	| "+" | "-" | "*" | "/" | "%"
	| "&" | "|" | "^" | "&^" | "<<" | ">>"
	| "&&" | "||"
	| "==" | "!=" | "<" | "<=" | ">" | ">="
);

export interface UnaryExpression<
	GenericOperand extends Expression = Expression,
> extends DModeling.ObjectTagWithGroup<"unary", ExpressionGroup> {
	operator: UnaryOperator;
	operand: GenericOperand;
}

export function unaryExpression<
	GenericOperand extends Expression,
>(
	properties: {
		operator: UnaryOperator;
		operand: GenericOperand;
	},
) {
	return DModeling.createTaggedObjectFactory<UnaryExpression<GenericOperand>>(
		"[node][expression]unary",
	)(properties);
}

export interface BinaryExpression<
	GenericOperand extends Expression = Expression,
> extends DModeling.ObjectTagWithGroup<"binary", ExpressionGroup> {
	operator: BinaryOperator;
	left: GenericOperand;
	right: GenericOperand;
}

export function binaryExpression<
	GenericLeft extends Expression,
	GenericRight extends Expression,
>(
	properties: {
		operator: BinaryOperator;
		left: GenericLeft;
		right: GenericRight;
	},
) {
	return DModeling.createTaggedObjectFactory<BinaryExpression<GenericLeft | GenericRight>>(
		"[node][expression]binary",
	)(properties);
}

export type AddressOperand = (
	| Identifier
	| SelectorExpression
	| IndexExpression
	| DereferenceExpression
	| CompositeLiteral
);

export interface AddressExpression extends DModeling.ObjectTagWithGroup<"address", ExpressionGroup> {
	operand: AddressOperand;
}

export const addressExpression = DModeling.createTaggedObjectFactory<
	AddressExpression
>("[node][expression]address");

export interface DereferenceExpression extends DModeling.ObjectTagWithGroup<"dereference", ExpressionGroup> {
	operand: Expression;
}

export const dereferenceExpression = DModeling.createTaggedObjectFactory<
	DereferenceExpression
>("[node][expression]dereference");

export interface ReceiveExpression extends DModeling.ObjectTagWithGroup<"receive", ExpressionGroup> {
	operand: Expression;
}

export const receiveExpression = DModeling.createTaggedObjectFactory<
	ReceiveExpression
>("[node][expression]receive");

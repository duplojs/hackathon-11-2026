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

export function createUnaryExpression<
	GenericOperand extends Expression,
>(
	properties: {
		operator: UnaryOperator;
		operand: GenericOperand;
	},
) {
	return DModeling.taggedObject<UnaryExpression<GenericOperand>>(
		"[node][expression]unary",
		properties,
	);
}

export interface BinaryExpression<
	GenericOperand extends Expression = Expression,
> extends DModeling.ObjectTagWithGroup<"binary", ExpressionGroup> {
	operator: BinaryOperator;
	left: GenericOperand;
	right: GenericOperand;
}

export function createBinaryExpression<
	GenericLeft extends Expression,
	GenericRight extends Expression,
>(
	properties: {
		operator: BinaryOperator;
		left: GenericLeft;
		right: GenericRight;
	},
) {
	return DModeling.taggedObject<BinaryExpression<GenericLeft | GenericRight>>(
		"[node][expression]binary",
		properties,
	);
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

export const createAddressExpression = DModeling.createTaggedObjectFactory<
	AddressExpression
>("[node][expression]address");

export interface DereferenceExpression extends DModeling.ObjectTagWithGroup<"dereference", ExpressionGroup> {
	operand: Expression;
}

export const createDereferenceExpression = DModeling.createTaggedObjectFactory<
	DereferenceExpression
>("[node][expression]dereference");

export interface ReceiveExpression extends DModeling.ObjectTagWithGroup<"receive", ExpressionGroup> {
	operand: Expression;
}

export const createReceiveExpression = DModeling.createTaggedObjectFactory<
	ReceiveExpression
>("[node][expression]receive");

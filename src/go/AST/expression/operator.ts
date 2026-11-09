import { createFactory } from "../base";
import { type Identifier } from "../identifier";
import { type IndexExpression, type SelectorExpression } from "./access";
import { type _Expression, type Expression } from "./base";
import { type CompositeLiteral } from "./composite";

export type UnaryOperator = "+" | "-" | "!" | "^";

export type BinaryOperator = (
	| "+" | "-" | "*" | "/" | "%"
	| "&" | "|" | "^" | "&^" | "<<" | ">>"
	| "&&" | "||"
	| "==" | "!=" | "<" | "<=" | ">" | ">="
);

export interface UnaryExpression<
	GenericOperand extends Expression = Expression,
> extends _Expression<"unary"> {
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
	return createFactory<UnaryExpression<GenericOperand>>(
		"node-expression-unary",
	)(properties);
}

export interface BinaryExpression<
	GenericOperand extends Expression = Expression,
> extends _Expression<"binary"> {
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
	return createFactory<BinaryExpression<GenericLeft | GenericRight>>(
		"node-expression-binary",
	)(properties);
}

export type AddressOperand = (
	| Identifier
	| SelectorExpression
	| IndexExpression
	| DereferenceExpression
	| CompositeLiteral
);

export interface AddressExpression extends _Expression<"address"> {
	operand: AddressOperand;
}

export const addressExpression = createFactory<
	AddressExpression
>("node-expression-address");

export interface DereferenceExpression extends _Expression<"dereference"> {
	operand: Expression;
}

export const dereferenceExpression = createFactory<
	DereferenceExpression
>("node-expression-dereference");

export interface ReceiveExpression extends _Expression<"receive"> {
	operand: Expression;
}

export const receiveExpression = createFactory<
	ReceiveExpression
>("node-expression-receive");

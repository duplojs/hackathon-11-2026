import { createFactory } from "../base";
import { type Type } from "../type/base";
import { type TypeReference } from "../type/reference";
import { type _Expression, type Expression } from "./base";

export type ConversionType = TypeReference | Type;

export interface ConversionExpression<
	GenericType extends ConversionType = ConversionType,
	GenericOperand extends Expression = Expression,
> extends _Expression<"conversion"> {
	typeReference: GenericType;
	operand: GenericOperand;
}

export function conversionExpression<
	GenericType extends ConversionType,
	GenericOperand extends Expression,
>(
	properties: {
		typeReference: GenericType;
		operand: GenericOperand;
	},
) {
	return createFactory<ConversionExpression<GenericType, GenericOperand>>(
		"node-expression-conversion",
	)(properties);
}

import * as DModeling from "@duplojs/lang/modeling";
import { type TypeReference } from "../common";
import { type Type } from "../type";
import { type Expression, type ExpressionGroup } from "./base";

export type ConversionType = TypeReference | Type;

export interface ConversionExpression<
	GenericType extends ConversionType = ConversionType,
	GenericOperand extends Expression = Expression,
> extends DModeling.ObjectTagWithGroup<"conversion", ExpressionGroup> {
	typeReference: GenericType;
	operand: GenericOperand;
}

export function createConversionExpression<
	GenericType extends ConversionType,
	GenericOperand extends Expression,
>(
	properties: {
		typeReference: GenericType;
		operand: GenericOperand;
	},
) {
	return DModeling.taggedObject<ConversionExpression<GenericType, GenericOperand>>(
		"[node][expression]conversion",
		properties,
	);
}

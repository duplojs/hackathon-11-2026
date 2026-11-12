import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier, type TypeReference } from "../common";
import { type Type } from "../type";
import { type Expression, type ExpressionGroup } from "./base";

export interface SelectorExpression<
	GenericTarget extends Expression = Expression,
> extends DModeling.ObjectTagWithGroup<"selector", ExpressionGroup> {
	target: GenericTarget;
	identifier: Identifier;
}

export function selectorExpression<
	GenericTarget extends Expression,
>(
	properties: {
		target: GenericTarget;
		identifier: Identifier;
	},
) {
	return DModeling.createTaggedObjectFactory<SelectorExpression<GenericTarget>>(
		"[node][expression]selector",
	)(properties);
}

export type MethodExpressionReceiver = TypeReference | Type;

export interface MethodExpression extends DModeling.ObjectTagWithGroup<"method", ExpressionGroup> {
	receiverType: MethodExpressionReceiver;
	identifier: Identifier;
}

export const methodExpression = DModeling.createTaggedObjectFactory<
	MethodExpression
>("[node][expression]method");

export interface IndexExpression extends DModeling.ObjectTagWithGroup<"index", ExpressionGroup> {
	target: Expression;
	index: Expression;
}

export const indexExpression = DModeling.createTaggedObjectFactory<
	IndexExpression
>("[node][expression]index");

export interface SliceExpression extends DModeling.ObjectTagWithGroup<"slice", ExpressionGroup> {
	target: Expression;
	low?: Expression;
	high?: Expression;
}

export const sliceExpression = DModeling.createTaggedObjectFactory<
	SliceExpression
>("[node][expression]slice");

export interface FullSliceExpression extends DModeling.ObjectTagWithGroup<"slice-full", ExpressionGroup> {
	target: Expression;
	low?: Expression;
	high: Expression;
	max: Expression;
}

export const fullSliceExpression = DModeling.createTaggedObjectFactory<
	FullSliceExpression
>("[node][expression]slice-full");

export type TypeAssertionType = TypeReference | Type;

export interface TypeAssertionExpression extends DModeling.ObjectTagWithGroup<"type-assertion", ExpressionGroup> {
	target: Expression;
	typeReference: TypeAssertionType;
}

export const typeAssertionExpression = DModeling.createTaggedObjectFactory<
	TypeAssertionExpression
>("[node][expression]type-assertion");

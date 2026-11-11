import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier } from "../identifier";
import { type Type } from "../type/base";
import { type TypeReference } from "../type/reference";
import { type _Expression, type Expression } from "./base";

export interface SelectorExpression<
	GenericTarget extends Expression = Expression,
> extends _Expression<"selector"> {
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
		"[node][expression]:selector",
	)(properties);
}

export type MethodExpressionReceiver = TypeReference | Type;

export interface MethodExpression extends _Expression<"method"> {
	receiverType: MethodExpressionReceiver;
	identifier: Identifier;
}

export const methodExpression = DModeling.createTaggedObjectFactory<
	MethodExpression
>("[node][expression]:method");

export interface IndexExpression extends _Expression<"index"> {
	target: Expression;
	index: Expression;
}

export const indexExpression = DModeling.createTaggedObjectFactory<
	IndexExpression
>("[node][expression]:index");

export interface SliceExpression extends _Expression<"slice"> {
	target: Expression;
	low?: Expression;
	high?: Expression;
}

export const sliceExpression = DModeling.createTaggedObjectFactory<
	SliceExpression
>("[node][expression]:slice");

export interface FullSliceExpression extends _Expression<"slice-full"> {
	target: Expression;
	low?: Expression;
	high: Expression;
	max: Expression;
}

export const fullSliceExpression = DModeling.createTaggedObjectFactory<
	FullSliceExpression
>("[node][expression]:slice-full");

export type TypeAssertionType = TypeReference | Type;

export interface TypeAssertionExpression extends _Expression<"type-assertion"> {
	target: Expression;
	typeReference: TypeAssertionType;
}

export const typeAssertionExpression = DModeling.createTaggedObjectFactory<
	TypeAssertionExpression
>("[node][expression]:type-assertion");

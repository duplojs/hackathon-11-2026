import * as DModeling from "@duplojs/lang/modeling";
import { type TypeReference } from "../common";
import { type Type } from "../type";
import { type Expression, type ExpressionGroup } from "./base";

export type CallTypeArgument = TypeReference | Type;

export interface CallExpression<
	GenericCallee extends Expression = Expression,
> extends DModeling.ObjectTagWithGroup<"call", ExpressionGroup> {
	callee: GenericCallee;
	typeArgument?: CallTypeArgument;
	arguments: readonly Expression[];
	variadicArgument?: Expression;
}

export function createCallExpression<
	GenericCallee extends Expression,
>(
	properties: {
		callee: GenericCallee;
		typeArgument?: CallTypeArgument;
		arguments: readonly Expression[];
		variadicArgument?: Expression;
	},
) {
	return DModeling.taggedObject<CallExpression<GenericCallee>>(
		"[node][expression]call",
		properties,
	);
}

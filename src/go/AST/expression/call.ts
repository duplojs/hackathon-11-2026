import * as DModeling from "@duplojs/lang/modeling";
import { type TypeReference } from "../common";
import { type Type } from "../type";
import { type Expression, type ExpressionGroup } from "./base";

export type CallTypeArgument = TypeReference | Type;

export interface CallExpression<
	GenericCallee extends Expression = Expression,
> extends DModeling.ObjectTagWithGroup<"call", ExpressionGroup> {
	callee: GenericCallee;
	// Premier argument de type pour les built-ins comme make et new.
	typeArgument?: CallTypeArgument;
	arguments: readonly Expression[];
	// Argument final développé avec ... après les arguments ordinaires.
	variadicArgument?: Expression;
}

export function callExpression<
	GenericCallee extends Expression,
>(
	properties: {
		callee: GenericCallee;
		typeArgument?: CallTypeArgument;
		arguments: readonly Expression[];
		variadicArgument?: Expression;
	},
) {
	return DModeling.createTaggedObjectFactory<CallExpression<GenericCallee>>(
		"[node][expression]call",
	)(properties);
}

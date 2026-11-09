import * as DModeling from "@duplojs/lang/modeling";
import { type Type } from "../type/base";
import { type TypeReference } from "../type/reference";
import { type _Expression, type Expression } from "./base";

export type CallTypeArgument = TypeReference | Type;

export interface CallExpression<
	GenericCallee extends Expression = Expression,
> extends _Expression<"call"> {
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
		"node-expression-call",
	)(properties);
}

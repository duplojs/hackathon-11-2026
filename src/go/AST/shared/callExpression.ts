import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type TypeReference } from "../common";
import { type Type } from "../type";
import { type Expression, type ExpressionGroup } from "../expression";
import { type StatementGroup } from "../statement";

export type CallTypeArgument = TypeReference | Type;

export interface CallExpression<
	GenericCallee extends Expression = Expression,
> extends DModeling.ObjectTagWithGroup<
		"call",
		[NodeGroup, ExpressionGroup[1], StatementGroup[1]]
	> {
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
		"[node][expression][statement]call",
		properties,
	);
}

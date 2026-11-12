import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "../..";
import { type Expression } from "..";

export interface KeyedElement<
	GenericKey extends Expression = Expression,
> extends DModeling.ObjectTagWithGroup<"literal-element-keyed", NodeGroup> {
	key: GenericKey;
	value: Expression;
}

export function keyedElement<
	GenericKey extends Expression,
>(
	properties: {
		key: GenericKey;
		value: Expression;
	},
) {
	return DModeling.createTaggedObjectFactory<KeyedElement<GenericKey>>(
		"[node]literal-element-keyed",
	)(properties);
}

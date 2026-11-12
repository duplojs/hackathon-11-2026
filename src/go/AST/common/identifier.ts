import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";

export interface Identifier<
	GenericValue extends string = string,
> extends DModeling.ObjectTagWithGroup<"identifier", NodeGroup> {
	readonly value: GenericValue;
}

export function createIdentifier<
	GenericValue extends string,
>(
	value: GenericValue,
): Identifier<GenericValue> {
	return DModeling.taggedObject(
		"[node]identifier",
		{
			value,
		},
	);
}

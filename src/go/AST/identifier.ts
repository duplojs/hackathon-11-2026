import * as DModeling from "@duplojs/lang/modeling";
import { type _Node } from "./base";

export interface Identifier<
	GenericValue extends string = string,
> extends _Node<"identifier", never> {
	readonly value: GenericValue;
}

export function createIdentifier<
	GenericValue extends string,
>(
	value: GenericValue,
): Identifier<GenericValue> {
	return DModeling.taggedObject(
		"[node]:identifier",
		{
			value,
		},
	);
}

import * as DModeling from "@duplojs/lang/modeling";

export interface Identifier<
	GenericValue extends string = string,
> extends DModeling.ObjectTag<"identifier"> {
	readonly value: GenericValue;
}

export function createIdentifier<
	GenericValue extends string,
>(
	value: GenericValue,
): Identifier<GenericValue> {
	return DModeling.taggedObject(
		"identifier",
		{
			value,
		},
	);
}

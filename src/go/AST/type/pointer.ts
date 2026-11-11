import * as DModeling from "@duplojs/lang/modeling";
import { type _Type, type Type } from "./base";
import { type TypeReference } from "./reference";

export type PointerTarget = (
	| TypeReference
	| Type
);

export interface PointerType<
	GenericTarget extends PointerTarget = PointerTarget,
> extends _Type<"pointer"> {
	typeReference: GenericTarget;
}

export function pointerType<
	GenericTarget extends PointerTarget,
>(
	properties: { typeReference: GenericTarget },
) {
	return DModeling.createTaggedObjectFactory<PointerType<GenericTarget>>(
		"[node][type]:pointer",
	)(properties);
}

import * as DModeling from "@duplojs/lang/modeling";
import { type TypeReference } from "../common";
import { type Type, type TypeGroup } from "./base";

export type PointerTarget = (
	| TypeReference
	| Type
);

export interface PointerType<
	GenericTarget extends PointerTarget = PointerTarget,
> extends DModeling.ObjectTagWithGroup<"pointer", TypeGroup> {
	typeReference: GenericTarget;
}

export function pointerType<
	GenericTarget extends PointerTarget,
>(
	properties: { typeReference: GenericTarget },
) {
	return DModeling.createTaggedObjectFactory<PointerType<GenericTarget>>(
		"[node][type]pointer",
	)(properties);
}

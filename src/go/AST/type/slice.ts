import * as DModeling from "@duplojs/lang/modeling";
import { type TypeReference } from "../common";
import { type Type, type TypeGroup } from "./base";

export type SliceElementType = (
	| TypeReference
	| Type
);

export interface SliceType extends DModeling.ObjectTagWithGroup<"slice", TypeGroup> {
	elementType: SliceElementType;
}

export const sliceType = DModeling.createTaggedObjectFactory<
	SliceType
>("[node][type]slice");

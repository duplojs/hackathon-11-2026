import * as DModeling from "@duplojs/lang/modeling";
import { type _Type, type Type } from "./base";
import { type TypeReference } from "./reference";

export type SliceElementType = (
	| TypeReference
	| Type
);

export interface SliceType extends _Type<"slice"> {
	elementType: SliceElementType;
}

export const sliceType = DModeling.createTaggedObjectFactory<
	SliceType
>("node-type-slice");

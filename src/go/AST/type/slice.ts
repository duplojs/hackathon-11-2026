import { createFactory } from "../base";
import { type _Type, type Type } from "./base";
import { type TypeReference } from "./reference";

export type SliceElementType = (
	| TypeReference
	| Type
);

export interface SliceType extends _Type<"slice"> {
	elementType: SliceElementType;
}

export const sliceType = createFactory<
	SliceType
>("node-type-slice");

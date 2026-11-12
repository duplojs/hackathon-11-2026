import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type TypeReference } from "./typeReference";
import { type StructType, type FunctionType, type ArrayType, type PointerType, type MapType, type ChannelType, type SliceType } from "../type";

export type TypeConstraintTarget = (
	| TypeReference
	| ArrayType
	| ChannelType
	| FunctionType
	| MapType
	| PointerType
	| SliceType
	| StructType
);

export interface TypeConstraint extends DModeling.ObjectTagWithGroup<"type-constraint", NodeGroup> {
	typeReference: TypeConstraintTarget;
}

export const typeConstraint = DModeling.createTaggedObjectFactory<
	TypeConstraint
>("[node]type-constraint");

import { createFactory, type _Node } from "../base";
import { type ArrayType } from "./array";
import { type ChannelType } from "./channel";
import { type FunctionType } from "./function";
import { type MapType } from "./map";
import { type PointerType } from "./pointer";
import { type TypeReference } from "./reference";
import { type SliceType } from "./slice";
import { type StructType } from "./struct";

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

export interface TypeConstraint extends _Node<"type-constraint"> {
	typeReference: TypeConstraintTarget;
}

export const typeConstraint = createFactory<
	TypeConstraint
>("node-type-constraint");

import { type _Node } from "../base";
import { type ArrayType } from "./array";
import { type ChannelType } from "./channel";
import { type FunctionType } from "./function";
import { type InterfaceType } from "./interface";
import { type MapType } from "./map";
import { type PointerType, type PointerTarget } from "./pointer";
import { type SliceType } from "./slice";
import { type StructType } from "./struct";

export type Type = (
	| ArrayType
	| ChannelType
	| FunctionType
	| InterfaceType
	| MapType
	| PointerType<PointerTarget>
	| SliceType
	| StructType
);

export interface _Type<
	GenericNodeName extends string = string,
> extends _Node<`type-${GenericNodeName}`> {

}

import type * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type StructType } from "./struct";
import { type FunctionType } from "./function";
import { type ArrayType } from "./array";
import { type PointerTarget, type PointerType } from "./pointer";
import { type MapType } from "./map";
import { type ChannelType } from "./channel";
import { type InterfaceType } from "./interface";
import { type SliceType } from "./slice";

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

export type TypeGroup = readonly [
	NodeGroup,
	DModeling.ObjectTagGroup<"type">,
];

import { createFactory } from "../base";
import { type ArrayType } from "./array";
import { type _Type, type Type } from "./base";
import { type ChannelType } from "./channel";
import { type InterfaceType } from "./interface";
import { type PointerType } from "./pointer";
import { type TypeReference } from "./reference";
import { type StructType } from "./struct";

export type MapKeyType = (
	| TypeReference
	| ArrayType
	| ChannelType
	| InterfaceType
	| PointerType
	| StructType
);

export type MapValueType = (
	| TypeReference
	| Type
);

export interface MapType extends _Type<"map"> {
	keyType: MapKeyType;
	valueType: MapValueType;
}

export const mapType = createFactory<
	MapType
>("node-type-map");

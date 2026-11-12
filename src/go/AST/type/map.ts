import * as DModeling from "@duplojs/lang/modeling";
import { type TypeReference } from "../common";
import { type StructType } from "./struct";
import { type Type, type TypeGroup } from "./base";
import { type ArrayType } from "./array";
import { type PointerType } from "./pointer";
import { type ChannelType } from "./channel";
import { type InterfaceType } from "./interface";

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

export interface MapType extends DModeling.ObjectTagWithGroup<"map", TypeGroup> {
	keyType: MapKeyType;
	valueType: MapValueType;
}

export const createMapType = DModeling.createTaggedObjectFactory<
	MapType
>("[node][type]map");

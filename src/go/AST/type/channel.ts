import * as DModeling from "@duplojs/lang/modeling";
import { type _Type, type Type } from "./base";
import { type TypeReference } from "./reference";

export type ChannelElementType = (
	| TypeReference
	| Type
);

export interface ChannelType extends _Type<"channel"> {
	elementType: ChannelElementType;
	direction: "bidirectional" | "send" | "receive";
}

export const channelType = DModeling.createTaggedObjectFactory<
	ChannelType
>("node-type-channel");

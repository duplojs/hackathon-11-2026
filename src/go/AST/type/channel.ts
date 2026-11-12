import * as DModeling from "@duplojs/lang/modeling";
import * as DCommon from "@duplojs/lang/common";
import { type TypeReference } from "../common";
import { type Type, type TypeGroup } from "./base";

export type ChannelElementType = (
	| TypeReference
	| Type
);

export const channelDirections = DCommon.createEnum([
	"bidirectional",
	"send",
	"receive",
]);

export type ChannelDirection = DCommon.GetEnumValue<typeof channelDirections>;

export interface ChannelType extends DModeling.ObjectTagWithGroup<"channel", TypeGroup> {
	elementType: ChannelElementType;
	direction: ChannelDirection;
}

export const createChannelType = DModeling.createTaggedObjectFactory<
	ChannelType
>("[node][type]channel");

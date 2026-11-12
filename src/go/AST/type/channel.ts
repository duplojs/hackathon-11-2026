import * as DModeling from "@duplojs/lang/modeling";
import { type TypeReference } from "../common";
import { type Type, type TypeGroup } from "./base";

export type ChannelElementType = (
	| TypeReference
	| Type
);

export interface ChannelType extends DModeling.ObjectTagWithGroup<"channel", TypeGroup> {
	elementType: ChannelElementType;
	direction: "bidirectional" | "send" | "receive";
}

export const createChannelType = DModeling.createTaggedObjectFactory<
	ChannelType
>("[node][type]channel");

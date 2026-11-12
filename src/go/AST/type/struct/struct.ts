import * as DModeling from "@duplojs/lang/modeling";
import { type StructMember } from "./structField";
import { type TypeGroup } from "..";

export interface StructType extends DModeling.ObjectTagWithGroup<"struct", TypeGroup> {
	fields: readonly StructMember[];
}

export const structType = DModeling.createTaggedObjectFactory<
	StructType
>("[node][type]struct");

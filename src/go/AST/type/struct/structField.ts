import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "../..";
import { type Identifier, type TypeReference } from "../../common";
import { type Type, type PointerType } from "..";

export type StructFieldType = (
	| TypeReference
	| Type
);

export type StructEmbeddedFieldType = (
	| TypeReference
	| PointerType<TypeReference>
);

export interface StructField extends DModeling.ObjectTagWithGroup<"struct-field", NodeGroup> {
	identifier: Identifier;
	typeReference: StructFieldType;
	tag?: string;
}

export const createStructField = DModeling.createTaggedObjectFactory<
	StructField
>("[node]struct-field");

export interface StructEmbeddedField extends DModeling.ObjectTagWithGroup<"struct-embedded-field", NodeGroup> {
	typeReference: StructEmbeddedFieldType;
	tag?: string;
}

export const createStructEmbeddedField = DModeling.createTaggedObjectFactory<
	StructEmbeddedField
>("[node]struct-embedded-field");

export type StructMember = StructField | StructEmbeddedField;

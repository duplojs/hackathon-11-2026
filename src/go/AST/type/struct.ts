import * as DModeling from "@duplojs/lang/modeling";
import { type _Node } from "../base";
import { type Identifier } from "../identifier";
import { type _Type, type Type } from "./base";
import { type PointerType } from "./pointer";
import { type TypeReference } from "./reference";

export type StructFieldType = (
	| TypeReference
	| Type
);

export type StructEmbeddedFieldType = (
	| TypeReference
	| PointerType<TypeReference>
);

export interface StructField extends _Node<"struct-field"> {
	identifier: Identifier;
	typeReference: StructFieldType;
	tag?: string;
}

export const structField = DModeling.createTaggedObjectFactory<
	StructField
>("[node]:struct-field");

export interface StructEmbeddedField extends _Node<"struct-embedded-field"> {
	typeReference: StructEmbeddedFieldType;
	tag?: string;
}

export const structEmbeddedField = DModeling.createTaggedObjectFactory<
	StructEmbeddedField
>("[node]:struct-embedded-field");

export type StructMember = StructField | StructEmbeddedField;

export interface StructType extends _Type<"struct"> {
	fields: readonly StructMember[];
}

export const structType = DModeling.createTaggedObjectFactory<
	StructType
>("[node][type]:struct");

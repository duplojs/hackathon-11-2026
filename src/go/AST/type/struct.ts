import { createFactory, type _Node } from "../base";
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

export const structField = createFactory<
	StructField
>("node-struct-field");

export interface StructEmbeddedField extends _Node<"struct-embedded-field"> {
	typeReference: StructEmbeddedFieldType;
	tag?: string;
}

export const structEmbeddedField = createFactory<
	StructEmbeddedField
>("node-struct-embedded-field");

export type StructMember = StructField | StructEmbeddedField;

export interface StructType extends _Type<"struct"> {
	fields: readonly StructMember[];
}

export const structType = createFactory<
	StructType
>("node-type-struct");

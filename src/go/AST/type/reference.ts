import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type _Node } from "../base";
import { createIdentifier, type Identifier } from "../identifier";
import { type Type } from "./base";

export const defaultTypeReferences = {
	any: createIdentifier("any"),
	bool: createIdentifier("bool"),
	byte: createIdentifier("byte"),
	comparable: createIdentifier("comparable"),
	complex64: createIdentifier("complex64"),
	complex128: createIdentifier("complex128"),
	error: createIdentifier("error"),
	float32: createIdentifier("float32"),
	float64: createIdentifier("float64"),
	int: createIdentifier("int"),
	int8: createIdentifier("int8"),
	int16: createIdentifier("int16"),
	int32: createIdentifier("int32"),
	int64: createIdentifier("int64"),
	rune: createIdentifier("rune"),
	string: createIdentifier("string"),
	uint: createIdentifier("uint"),
	uint8: createIdentifier("uint8"),
	uint16: createIdentifier("uint16"),
	uint32: createIdentifier("uint32"),
	uint64: createIdentifier("uint64"),
	uintptr: createIdentifier("uintptr"),
};

export type DefaultTypeReference<
	GenericName extends keyof typeof defaultTypeReferences = keyof typeof defaultTypeReferences,
> = typeof defaultTypeReferences[GenericName];

export type TypeReference = (
	| Identifier
	| PackageTypeReference
	| GenericTypeReference
);

export interface PackageTypeReference extends _Node<"type-reference-package"> {
	packageName: Identifier;
	identifier: Identifier;
}

export const packageTypeReference = DModeling.createTaggedObjectFactory<
	PackageTypeReference
>("node-type-reference-package");

export type GenericTypeTarget = (
	| Identifier
	| PackageTypeReference
);

export type GenericTypeArgument = (
	| TypeReference
	| Type
);

export interface GenericTypeReference extends _Node<"type-reference-generic"> {
	typeReference: GenericTypeTarget;
	typeArguments: readonly GenericTypeArgument[] & DArray.MinElements<1>;
}

export const genericTypeReference = DModeling.createTaggedObjectFactory<
	GenericTypeReference
>("node-type-reference-generic");


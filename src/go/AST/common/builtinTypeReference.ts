import * as DCommon from "@duplojs/lang/common";
import { type Identifier, createIdentifier } from "./identifier";

export const builtinTypeNames = DCommon.createEnum([
	"any",
	"bool",
	"byte",
	"comparable",
	"complex64",
	"complex128",
	"error",
	"float32",
	"float64",
	"int",
	"int8",
	"int16",
	"int32",
	"int64",
	"rune",
	"string",
	"uint",
	"uint8",
	"uint16",
	"uint32",
	"uint64",
	"uintptr",
]);

export type BuiltinTypeName = DCommon.GetEnumValue<typeof builtinTypeNames>;

export interface BuiltinTypeReference<
	GenericName extends BuiltinTypeName = BuiltinTypeName,
> extends Identifier<GenericName> {

}

export function isBuiltinTypeReference(
	typeReference: Identifier,
): typeReference is BuiltinTypeReference {
	return builtinTypeNames.has(typeReference.value);
}

export const builtinTypeReferences = {
	any: createIdentifier(builtinTypeNames.any),
	bool: createIdentifier(builtinTypeNames.bool),
	byte: createIdentifier(builtinTypeNames.byte),
	comparable: createIdentifier(builtinTypeNames.comparable),
	complex64: createIdentifier(builtinTypeNames.complex64),
	complex128: createIdentifier(builtinTypeNames.complex128),
	error: createIdentifier(builtinTypeNames.error),
	float32: createIdentifier(builtinTypeNames.float32),
	float64: createIdentifier(builtinTypeNames.float64),
	int: createIdentifier(builtinTypeNames.int),
	int8: createIdentifier(builtinTypeNames.int8),
	int16: createIdentifier(builtinTypeNames.int16),
	int32: createIdentifier(builtinTypeNames.int32),
	int64: createIdentifier(builtinTypeNames.int64),
	rune: createIdentifier(builtinTypeNames.rune),
	string: createIdentifier(builtinTypeNames.string),
	uint: createIdentifier(builtinTypeNames.uint),
	uint8: createIdentifier(builtinTypeNames.uint8),
	uint16: createIdentifier(builtinTypeNames.uint16),
	uint32: createIdentifier(builtinTypeNames.uint32),
	uint64: createIdentifier(builtinTypeNames.uint64),
	uintptr: createIdentifier(builtinTypeNames.uintptr),
} satisfies {
	readonly [GenericName in BuiltinTypeName]: Identifier<GenericName>;
};

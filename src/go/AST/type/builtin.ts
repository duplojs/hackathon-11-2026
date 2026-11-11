import * as DModeling from "@duplojs/lang/modeling";
import { type _Node } from "../base";

export type BuiltinTypeName =
	| "any"
	| "bool"
	| "byte"
	| "comparable"
	| "complex64"
	| "complex128"
	| "error"
	| "float32"
	| "float64"
	| "int"
	| "int8"
	| "int16"
	| "int32"
	| "int64"
	| "rune"
	| "string"
	| "uint"
	| "uint8"
	| "uint16"
	| "uint32"
	| "uint64"
	| "uintptr";

export interface BuiltinTypeReference<
	GenericName extends BuiltinTypeName = BuiltinTypeName,
> extends _Node<"type-reference-builtin"> {
	readonly value: GenericName;
}

export function builtinTypeReference<GenericName extends BuiltinTypeName>(value: GenericName) {
	return DModeling.taggedObject<BuiltinTypeReference<GenericName>>(
		"[node]:type-reference-builtin",
		{ value },
	);
}

export const builtinTypeReferences = {
	any: builtinTypeReference("any"),
	bool: builtinTypeReference("bool"),
	byte: builtinTypeReference("byte"),
	comparable: builtinTypeReference("comparable"),
	complex64: builtinTypeReference("complex64"),
	complex128: builtinTypeReference("complex128"),
	error: builtinTypeReference("error"),
	float32: builtinTypeReference("float32"),
	float64: builtinTypeReference("float64"),
	int: builtinTypeReference("int"),
	int8: builtinTypeReference("int8"),
	int16: builtinTypeReference("int16"),
	int32: builtinTypeReference("int32"),
	int64: builtinTypeReference("int64"),
	rune: builtinTypeReference("rune"),
	string: builtinTypeReference("string"),
	uint: builtinTypeReference("uint"),
	uint8: builtinTypeReference("uint8"),
	uint16: builtinTypeReference("uint16"),
	uint32: builtinTypeReference("uint32"),
	uint64: builtinTypeReference("uint64"),
	uintptr: builtinTypeReference("uintptr"),
};

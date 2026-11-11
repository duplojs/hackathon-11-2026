import type * as TS from "typescript/ast";
import type { Type } from "typescript/async";

export function isTypescriptNode(value: unknown): value is TS.Node {
	return typeof value === "object" && value !== null
		&& "kind" in value && typeof value.kind === "number"
		&& "pos" in value && typeof value.pos === "number"
		&& "end" in value && typeof value.end === "number";
}

export function isTypescriptType(value: unknown): value is Type {
	return typeof value === "object" && value !== null
		&& "flags" in value && typeof value.flags === "number"
		&& "id" in value && typeof value.id === "number"
		&& "getSymbol" in value && typeof value.getSymbol === "function"
		&& "isUnionType" in value && typeof value.isUnionType === "function";
}

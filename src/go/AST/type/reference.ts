import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type _Node } from "../base";
import { type Identifier } from "../identifier";
import { type Type } from "./base";
import { type BuiltinTypeReference } from "./builtin";

export type TypeReference = (
	| Identifier
	| BuiltinTypeReference
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


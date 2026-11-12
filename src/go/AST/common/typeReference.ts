import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type NodeGroup } from "..";
import { type Identifier } from "./identifier";
import { type Type } from "../type";

export type TypeReference = (
	| Identifier
	| PackageTypeReference
	| GenericTypeReference
);

export interface PackageTypeReference extends DModeling.ObjectTagWithGroup<"type-reference-package", NodeGroup> {
	packageName: Identifier;
	identifier: Identifier;
}

export const createPackageTypeReference = DModeling.createTaggedObjectFactory<
	PackageTypeReference
>("[node]type-reference-package");

export type GenericTypeTarget = (
	| Identifier
	| PackageTypeReference
);

export type GenericTypeArgument = (
	| TypeReference
	| Type
);

export interface GenericTypeReference extends DModeling.ObjectTagWithGroup<"type-reference-generic", NodeGroup> {
	typeReference: GenericTypeTarget;
	typeArguments: readonly GenericTypeArgument[] & DArray.MinElements<1>;
}

export const createGenericTypeReference = DModeling.createTaggedObjectFactory<
	GenericTypeReference
>("[node]type-reference-generic");


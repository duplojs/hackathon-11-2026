import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "../base";
import { type Identifier, type TypeReference, type TypeConstraint, type FunctionArgument } from "../common";
import { type InterfaceUnion } from "./interface";
import { type Type, type TypeGroup } from "./base";

export type FunctionReturnType = (
	| TypeReference
	| Type
);

export type TypeParameterConstraint = (
	| TypeReference
	| Type
	| TypeConstraint
	| InterfaceUnion
);

export interface TypeParameter extends DModeling.ObjectTagWithGroup<"type-parameter", NodeGroup> {
	identifier: Identifier;
	constraint: TypeParameterConstraint;
}

export const createTypeParameter = DModeling.createTaggedObjectFactory<
	TypeParameter
>("[node]type-parameter");

export interface FunctionType extends DModeling.ObjectTagWithGroup<"function", TypeGroup> {
	arguments: readonly FunctionArgument[];
	variadicArgument?: FunctionArgument;
	returnTypes: readonly FunctionReturnType[];
}

export const createFunctionType = DModeling.createTaggedObjectFactory<
	FunctionType
>("[node][type]function");

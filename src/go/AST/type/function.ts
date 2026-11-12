import * as DModeling from "@duplojs/lang/modeling";
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

export type TypeParameter = readonly [identifier: Identifier, constraint: TypeParameterConstraint];

export interface FunctionType extends DModeling.ObjectTagWithGroup<"function", TypeGroup> {
	arguments: readonly FunctionArgument[];
	variadicArgument?: FunctionArgument;
	returnTypes: readonly FunctionReturnType[];
}

export const createFunctionType = DModeling.createTaggedObjectFactory<
	FunctionType
>("[node][type]function");

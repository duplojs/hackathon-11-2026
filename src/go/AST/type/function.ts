import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier, type TypeReference, type TypeConstraint } from "../common";
import { type InterfaceUnion } from "./interface";
import { type Type, type TypeGroup } from "./base";

export type FunctionParameterType = (
	| TypeReference
	| Type
);

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

export type FunctionParameter = readonly [identifier: Identifier, typeReference: FunctionParameterType];

export type TypeParameter = readonly [identifier: Identifier, constraint: TypeParameterConstraint];

export interface FunctionType extends DModeling.ObjectTagWithGroup<"function", TypeGroup> {
	parameters: readonly FunctionParameter[];
	variadicParameter?: FunctionParameter;
	returnTypes: readonly FunctionReturnType[];
}

export const createFunctionType = DModeling.createTaggedObjectFactory<
	FunctionType
>("[node][type]function");

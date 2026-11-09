import { createFactory } from "../base";
import { type Identifier } from "../identifier";
import { type _Type, type Type } from "./base";
import { type TypeConstraint } from "./constraint";
import { type InterfaceUnion } from "./interface";
import { type TypeReference } from "./reference";

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

export interface FunctionType extends _Type<"function"> {
	parameters: readonly FunctionParameter[];
	variadicParameter?: FunctionParameter;
	returnTypes: readonly FunctionReturnType[];
}

export const functionType = createFactory<
	FunctionType
>("node-type-function");

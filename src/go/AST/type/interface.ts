import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type _Node } from "../base";
import { type Identifier } from "../identifier";
import { type _Type, type Type } from "./base";
import { type TypeConstraint } from "./constraint";
import { type FunctionParameter } from "./function";
import { type TypeReference } from "./reference";

export type InterfaceMethodReturnType = (
	| TypeReference
	| Type
);

export type InterfaceUnionTerm = (
	| TypeReference
	| Type
	| TypeConstraint
);

export interface InterfaceMethod extends _Node<"interface-method"> {
	identifier: Identifier;
	parameters: readonly FunctionParameter[];
	variadicParameter?: FunctionParameter;
	returnTypes: readonly InterfaceMethodReturnType[];
}

export const interfaceMethod = DModeling.createTaggedObjectFactory<
	InterfaceMethod
>("[node]:interface-method");

export interface InterfaceUnion extends _Node<"interface-union"> {
	terms: readonly InterfaceUnionTerm[] & DArray.MinElements<1>;
}

export const typeUnion = DModeling.createTaggedObjectFactory<
	InterfaceUnion
>("[node]:interface-union");

export type InterfaceElement = (
	| InterfaceMethod
	| InterfaceUnion
	| TypeConstraint
	| TypeReference
	| Type
);

export interface InterfaceType extends _Type<"interface"> {
	elements: readonly InterfaceElement[];
}

export const interfaceType = DModeling.createTaggedObjectFactory<
	InterfaceType
>("[node][type]:interface");

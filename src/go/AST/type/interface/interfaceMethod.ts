import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "../..";
import { type Identifier, type TypeReference } from "../../common";
import { type FunctionParameter, type Type } from "..";

export type InterfaceMethodReturnType = (
	| TypeReference
	| Type
);

export interface InterfaceMethod extends DModeling.ObjectTagWithGroup<"interface-method", NodeGroup> {
	identifier: Identifier;
	parameters: readonly FunctionParameter[];
	variadicParameter?: FunctionParameter;
	returnTypes: readonly InterfaceMethodReturnType[];
}

export const interfaceMethod = DModeling.createTaggedObjectFactory<
	InterfaceMethod
>("[node]interface-method");

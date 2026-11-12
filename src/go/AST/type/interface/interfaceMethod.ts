import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "../..";
import { type Identifier, type TypeReference, type FunctionArgument } from "../../common";
import { type Type } from "..";

export type InterfaceMethodReturnType = (
	| TypeReference
	| Type
);

export interface InterfaceMethod extends DModeling.ObjectTagWithGroup<"interface-method", NodeGroup> {
	identifier: Identifier;
	arguments: readonly FunctionArgument[];
	variadicArgument?: FunctionArgument;
	returnTypes: readonly InterfaceMethodReturnType[];
}

export const createInterfaceMethod = DModeling.createTaggedObjectFactory<
	InterfaceMethod
>("[node]interface-method");

import * as DModeling from "@duplojs/lang/modeling";
import { type TypeReference, type TypeConstraint } from "../../common";
import { type InterfaceUnion } from "./interfaceUnion";
import { type InterfaceMethod } from "./interfaceMethod";
import { type Type, type TypeGroup } from "..";

export type InterfaceElement = (
	| InterfaceMethod
	| InterfaceUnion
	| TypeConstraint
	| TypeReference
	| Type
);

export interface InterfaceType extends DModeling.ObjectTagWithGroup<"interface", TypeGroup> {
	elements: readonly InterfaceElement[];
}

export const interfaceType = DModeling.createTaggedObjectFactory<
	InterfaceType
>("[node][type]interface");

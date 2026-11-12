import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type NodeGroup } from "../..";
import { type TypeReference, type TypeConstraint } from "../../common";
import { type Type } from "..";

export type InterfaceUnionTerm = (
	| TypeReference
	| Type
	| TypeConstraint
);

export interface InterfaceUnion extends DModeling.ObjectTagWithGroup<"interface-union", NodeGroup> {
	terms: readonly InterfaceUnionTerm[] & DArray.MinElements<1>;
}

export const typeUnion = DModeling.createTaggedObjectFactory<
	InterfaceUnion
>("[node]interface-union");

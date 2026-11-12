import * as DModeling from "@duplojs/lang/modeling";
import type * as DArray from "@duplojs/lang/array";
import { type NodeGroup } from "../..";
import { type Statement } from "..";
import { type TypeReference } from "../../common";
import { type Type } from "../../type";
import { type NilLiteral } from "../../expression";

export type TypeSwitchCaseType = TypeReference | Type | NilLiteral;

export interface TypeSwitchCase extends DModeling.ObjectTagWithGroup<"switch-case-type", NodeGroup> {
	types: readonly TypeSwitchCaseType[] & DArray.MinElements<1>;
	statements: readonly Statement[];
}

export const typeSwitchCase = DModeling.createTaggedObjectFactory<
	TypeSwitchCase
>("[node]switch-case-type");

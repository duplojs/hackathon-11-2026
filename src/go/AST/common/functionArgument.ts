import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type Type } from "../type";
import { type Identifier } from "./identifier";
import { type TypeReference } from "./typeReference";

export type FunctionArgumentType = TypeReference | Type;

export interface FunctionArgument extends DModeling.ObjectTagWithGroup<"function-argument", NodeGroup> {
	identifier: Identifier;
	type: FunctionArgumentType;
}

export const createFunctionArgument = DModeling.createTaggedObjectFactory<
	FunctionArgument
>("[node]function-argument");

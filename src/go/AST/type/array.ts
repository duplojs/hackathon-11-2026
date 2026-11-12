import * as DModeling from "@duplojs/lang/modeling";
import { type TypeReference } from "../common";
import { type Type, type TypeGroup } from "./base";
import { type ConstantExpression } from "../expression";

export type ArrayLength = ConstantExpression;

export type ArrayElementType = (
	| TypeReference
	| Type
);

export interface ArrayType extends DModeling.ObjectTagWithGroup<"array", TypeGroup> {
	length: ArrayLength;
	elementType: ArrayElementType;
}

export const createArrayType = DModeling.createTaggedObjectFactory<
	ArrayType
>("[node][type]array");

import * as DModeling from "@duplojs/lang/modeling";
import { type ConstantExpression } from "../expression/constant";
import { type _Type, type Type } from "./base";
import { type TypeReference } from "./reference";

export type ArrayLength = ConstantExpression;

export type ArrayElementType = (
	| TypeReference
	| Type
);

export interface ArrayType extends _Type<"array"> {
	length: ArrayLength;
	elementType: ArrayElementType;
}

export const arrayType = DModeling.createTaggedObjectFactory<
	ArrayType
>("[node][type]:array");

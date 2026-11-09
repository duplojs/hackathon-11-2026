import { createFactory } from "../base";
import { type Identifier } from "../identifier";
import { type _Type, type Type } from "./base";
import { type TypeReference } from "./reference";

// Il manque une expression constante pour représenter les longueurs calculées.
export type ArrayLength = number | Identifier;

export type ArrayElementType = (
	| TypeReference
	| Type
);

export interface ArrayType extends _Type<"array"> {
	length: ArrayLength;
	elementType: ArrayElementType;
}

export const arrayType = createFactory<
	ArrayType
>("node-type-array");

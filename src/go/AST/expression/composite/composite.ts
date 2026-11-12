import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier, type TypeReference } from "../../common";
import { type KeyedElement } from "./keyedElement";
import { type StructType, type ArrayType, type MapType, type SliceType } from "../../type";
import { type Expression, type ExpressionGroup, type ConstantExpression } from "..";

export type CompositeLiteral = (
	| ArrayLiteral
	| SliceLiteral
	| MapLiteral
	| StructLiteral
);

export type ArrayLiteralType = TypeReference | ArrayType;

export type ArrayLiteralElement = Expression | KeyedElement<ConstantExpression>;

export interface ArrayLiteral extends DModeling.ObjectTagWithGroup<"literal-array", ExpressionGroup> {
	typeReference: ArrayLiteralType;
	elements: readonly ArrayLiteralElement[];
}

export const arrayLiteral = DModeling.createTaggedObjectFactory<
	ArrayLiteral
>("[node][expression]literal-array");

export type SliceLiteralType = TypeReference | SliceType;

export type SliceLiteralElement = Expression | KeyedElement<ConstantExpression>;

export interface SliceLiteral extends DModeling.ObjectTagWithGroup<"literal-slice", ExpressionGroup> {
	typeReference: SliceLiteralType;
	elements: readonly SliceLiteralElement[];
}

export const sliceLiteral = DModeling.createTaggedObjectFactory<
	SliceLiteral
>("[node][expression]literal-slice");

export type MapLiteralType = TypeReference | MapType;

export interface MapLiteral extends DModeling.ObjectTagWithGroup<"literal-map", ExpressionGroup> {
	typeReference: MapLiteralType;
	elements: readonly KeyedElement[];
}

export const mapLiteral = DModeling.createTaggedObjectFactory<
	MapLiteral
>("[node][expression]literal-map");

export type StructLiteralType = TypeReference | StructType;

export type StructLiteralElement = Expression | KeyedElement<Identifier>;

export interface StructLiteral extends DModeling.ObjectTagWithGroup<"literal-struct", ExpressionGroup> {
	typeReference: StructLiteralType;
	// Une struct utilise soit uniquement des positions, soit uniquement des champs nommés.
	elements: readonly Expression[] | readonly KeyedElement<Identifier>[];
}

export const structLiteral = DModeling.createTaggedObjectFactory<
	StructLiteral
>("[node][expression]literal-struct");

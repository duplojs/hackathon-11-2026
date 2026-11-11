import * as DModeling from "@duplojs/lang/modeling";
import { type _Node } from "../base";
import { type Identifier } from "../identifier";
import { type ArrayType } from "../type/array";
import { type MapType } from "../type/map";
import { type TypeReference } from "../type/reference";
import { type SliceType } from "../type/slice";
import { type StructType } from "../type/struct";
import { type _Expression, type Expression } from "./base";
import { type ConstantExpression } from "./constant";

export type CompositeLiteral = (
	| ArrayLiteral
	| SliceLiteral
	| MapLiteral
	| StructLiteral
);

export interface KeyedElement<
	GenericKey extends Expression = Expression,
> extends _Node<"literal-element-keyed"> {
	key: GenericKey;
	value: Expression;
}

export function keyedElement<
	GenericKey extends Expression,
>(
	properties: {
		key: GenericKey;
		value: Expression;
	},
) {
	return DModeling.createTaggedObjectFactory<KeyedElement<GenericKey>>(
		"[node]:literal-element-keyed",
	)(properties);
}

export type ArrayLiteralType = TypeReference | ArrayType;

export type ArrayLiteralElement = Expression | KeyedElement<ConstantExpression>;

export interface ArrayLiteral extends _Expression<"literal-array"> {
	typeReference: ArrayLiteralType;
	elements: readonly ArrayLiteralElement[];
}

export const arrayLiteral = DModeling.createTaggedObjectFactory<
	ArrayLiteral
>("[node][expression]:literal-array");

export type SliceLiteralType = TypeReference | SliceType;

export type SliceLiteralElement = Expression | KeyedElement<ConstantExpression>;

export interface SliceLiteral extends _Expression<"literal-slice"> {
	typeReference: SliceLiteralType;
	elements: readonly SliceLiteralElement[];
}

export const sliceLiteral = DModeling.createTaggedObjectFactory<
	SliceLiteral
>("[node][expression]:literal-slice");

export type MapLiteralType = TypeReference | MapType;

export interface MapLiteral extends _Expression<"literal-map"> {
	typeReference: MapLiteralType;
	elements: readonly KeyedElement[];
}

export const mapLiteral = DModeling.createTaggedObjectFactory<
	MapLiteral
>("[node][expression]:literal-map");

export type StructLiteralType = TypeReference | StructType;

export type StructLiteralElement = Expression | KeyedElement<Identifier>;

export interface StructLiteral extends _Expression<"literal-struct"> {
	typeReference: StructLiteralType;
	// Une struct utilise soit uniquement des positions, soit uniquement des champs nommés.
	elements: readonly Expression[] | readonly KeyedElement<Identifier>[];
}

export const structLiteral = DModeling.createTaggedObjectFactory<
	StructLiteral
>("[node][expression]:literal-struct");

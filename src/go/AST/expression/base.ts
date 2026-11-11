import { type _Node } from "../base";
import { type Identifier } from "../identifier";
import { type IndexExpression, type MethodExpression, type SelectorExpression, type SliceExpression, type FullSliceExpression, type TypeAssertionExpression } from "./access";
import { type CallExpression } from "./call";
import { type CompositeLiteral } from "./composite";
import { type ConversionExpression } from "./conversion";
import { type FunctionLiteral } from "./function";
import { type InstantiationExpression } from "./instantiation";
import { type Literal } from "./literal";
import { type AddressExpression, type BinaryExpression, type DereferenceExpression, type ReceiveExpression, type UnaryExpression } from "./operator";

export type Expression = (
	| Identifier
	| Literal
	| CompositeLiteral
	| FunctionLiteral
	| CallExpression
	| ConversionExpression
	| InstantiationExpression
	| UnaryExpression
	| BinaryExpression
	| AddressExpression
	| DereferenceExpression
	| ReceiveExpression
	| SelectorExpression
	| MethodExpression
	| IndexExpression
	| SliceExpression
	| FullSliceExpression
	| TypeAssertionExpression
);

export interface _Expression<
	GenericNodeName extends string = string,
> extends _Node<GenericNodeName, "expression"> {

}

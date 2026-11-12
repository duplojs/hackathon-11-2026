import type * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type Identifier } from "../common";
import { type FunctionLiteral } from "./function";
import { type InstantiationExpression } from "./instantiation";
import { type CallExpression } from "./call";
import { type CompositeLiteral } from "./composite";
import { type UnaryExpression, type BinaryExpression, type AddressExpression, type DereferenceExpression, type ReceiveExpression } from "./operator";
import { type SelectorExpression, type MethodExpression, type IndexExpression, type SliceExpression, type FullSliceExpression, type TypeAssertionExpression } from "./access";
import { type ConversionExpression } from "./conversion";
import { type Literal } from "./literal";

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

export type ExpressionGroup = readonly [
	NodeGroup,
	DModeling.ObjectTagGroup<"expression">,
];

import type * as DModeling from "@duplojs/lang/modeling";
import { type ConstantDeclaration } from "./declaration/constant";
import { type FunctionDeclaration, type MethodDeclaration } from "./declaration/function";
import { type ImportDeclaration } from "./declaration/import";
import { type TypeDeclaration, type TypeAliasDeclaration } from "./declaration/type";
import { type VariableDeclarationZeroValue, type VariableDeclarationInitialized } from "./declaration/variable";
import { type SelectorExpression, type MethodExpression, type IndexExpression, type SliceExpression, type FullSliceExpression, type TypeAssertionExpression } from "./expression/access";
import { type CallExpression } from "./expression/call";
import { type KeyedElement, type ArrayLiteral, type SliceLiteral, type MapLiteral, type StructLiteral } from "./expression/composite";
import { type ConversionExpression } from "./expression/conversion";
import { type FunctionLiteral } from "./expression/function";
import { type InstantiationExpression } from "./expression/instantiation";
import { type IntegerLiteral, type FloatLiteral, type ImaginaryLiteral, type RuneLiteral, type StringLiteral, type BooleanLiteral, type NilLiteral } from "./expression/literal";
import { type UnaryExpression, type BinaryExpression, type AddressExpression, type DereferenceExpression, type ReceiveExpression } from "./expression/operator";
import { type GoFile } from "./file";
import { type Identifier } from "./identifier";
import { type AssignmentStatement, type CompoundAssignmentStatement, type ShortVariableDeclarationStatement } from "./statement/assignment";
import { type BlockStatement } from "./statement/block";
import { type GoStatement, type DeferStatement } from "./statement/call";
import { type SendStatement } from "./statement/channel";
import { type ExpressionStatement } from "./statement/expression";
import { type ForStatement, type RangeAssignment, type RangeDeclaration, type RangeStatement } from "./statement/for";
import { type IfStatement } from "./statement/if";
import { type ReturnStatement, type BreakStatement, type ContinueStatement, type GotoStatement, type FallthroughStatement, type LabeledStatement } from "./statement/jump";
import { type SelectReceiveAssignment, type SelectReceiveDeclaration, type SelectCase, type SelectStatementWithoutDefault, type SelectStatementWithDefault } from "./statement/select";
import { type ExpressionSwitchCase, type DefaultCase, type ExpressionSwitchStatementWithoutDefault, type ExpressionSwitchStatementWithDefault, type TypeSwitchCase, type TypeSwitchStatementWithoutDefault, type TypeSwitchStatementWithDefault } from "./statement/switch";
import { type ArrayType } from "./type/array";
import { type BuiltinTypeReference } from "./type/builtin";
import { type ChannelType } from "./type/channel";
import { type TypeConstraint } from "./type/constraint";
import { type FunctionType } from "./type/function";
import { type InterfaceMethod, type InterfaceUnion, type InterfaceType } from "./type/interface";
import { type MapType } from "./type/map";
import { type PointerType } from "./type/pointer";
import { type PackageTypeReference, type GenericTypeReference } from "./type/reference";
import { type SliceType } from "./type/slice";
import { type StructField, type StructEmbeddedField, type StructType } from "./type/struct";
import type * as DCommon from "@duplojs/lang/common";

export interface _Node<
	GenericNodeName extends string = string,
	GenericSubGroup extends string = never,
> extends DModeling.ObjectTagWithGroups<
		[
			"node",
			...(
				DCommon.IsNever<GenericSubGroup> extends true
					? []
					: [GenericSubGroup]
			),
		],
		GenericNodeName
	> {

}

export type Node = (
	| ConstantDeclaration
	| FunctionDeclaration
	| MethodDeclaration
	| ImportDeclaration
	| TypeDeclaration
	| TypeAliasDeclaration
	| VariableDeclarationZeroValue
	| VariableDeclarationInitialized
	| SelectorExpression
	| MethodExpression
	| IndexExpression
	| SliceExpression
	| FullSliceExpression
	| TypeAssertionExpression
	| CallExpression
	| KeyedElement
	| ArrayLiteral
	| SliceLiteral
	| MapLiteral
	| StructLiteral
	| ConversionExpression
	| FunctionLiteral
	| InstantiationExpression
	| IntegerLiteral
	| FloatLiteral
	| ImaginaryLiteral
	| RuneLiteral
	| StringLiteral
	| BooleanLiteral
	| NilLiteral
	| UnaryExpression
	| BinaryExpression
	| AddressExpression
	| DereferenceExpression
	| ReceiveExpression
	| GoFile
	| Identifier
	| AssignmentStatement
	| CompoundAssignmentStatement
	| ShortVariableDeclarationStatement
	| BlockStatement
	| GoStatement
	| DeferStatement
	| SendStatement
	| ExpressionStatement
	| ForStatement
	| RangeAssignment
	| RangeDeclaration
	| RangeStatement
	| IfStatement
	| ReturnStatement
	| BreakStatement
	| ContinueStatement
	| GotoStatement
	| FallthroughStatement
	| LabeledStatement
	| SelectReceiveAssignment
	| SelectReceiveDeclaration
	| SelectCase
	| SelectStatementWithoutDefault
	| SelectStatementWithDefault
	| ExpressionSwitchCase
	| DefaultCase
	| ExpressionSwitchStatementWithoutDefault
	| ExpressionSwitchStatementWithDefault
	| TypeSwitchCase
	| TypeSwitchStatementWithoutDefault
	| TypeSwitchStatementWithDefault
	| ArrayType
	| BuiltinTypeReference
	| ChannelType
	| TypeConstraint
	| FunctionType
	| InterfaceMethod
	| InterfaceUnion
	| InterfaceType
	| MapType
	| PointerType
	| PackageTypeReference
	| GenericTypeReference
	| SliceType
	| StructField
	| StructEmbeddedField
	| StructType
);

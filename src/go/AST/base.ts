import type * as DModeling from "@duplojs/lang/modeling";
import { type IfStatement, type GoStatement, type DeferStatement, type BlockStatement, type SelectStatementWithoutDefault, type SelectStatementWithDefault, type ForStatement, type RangeStatement, type AssignmentStatement, type CompoundAssignmentStatement, type ShortVariableDeclarationStatement, type ExpressionSwitchStatementWithoutDefault, type ExpressionSwitchStatementWithDefault, type TypeSwitchStatementWithoutDefault, type TypeSwitchStatementWithDefault, type ReturnStatement, type BreakStatement, type ContinueStatement, type GotoStatement, type FallthroughStatement, type LabeledStatement, type SendStatement, type SelectCase, type ExpressionSwitchCase, type TypeSwitchCase, type SelectReceiveAssignment, type SelectReceiveDeclaration, type RangeAssignment, type RangeDeclaration } from "./statement";
import { type Identifier, type PackageTypeReference, type GenericTypeReference, type TypeConstraint, type DefaultCase, type GoFile, type ImportDeclaration } from "./common";
import { type VariableDeclarationZeroValue, type VariableDeclarationInitialized, type TypeDeclaration, type TypeAliasDeclaration, type ConstantDeclaration } from "./shared";
import { type StructField, type StructEmbeddedField, type InterfaceUnion, type InterfaceMethod, type StructType, type FunctionType, type ArrayType, type PointerType, type MapType, type ChannelType, type InterfaceType, type SliceType } from "./type";
import { type KeyedElement, type FunctionLiteral, type InstantiationExpression, type CallExpression, type ArrayLiteral, type SliceLiteral, type MapLiteral, type StructLiteral, type UnaryExpression, type BinaryExpression, type AddressExpression, type DereferenceExpression, type ReceiveExpression, type SelectorExpression, type MethodExpression, type IndexExpression, type SliceExpression, type FullSliceExpression, type TypeAssertionExpression, type ConversionExpression, type IntegerLiteral, type FloatLiteral, type ImaginaryLiteral, type RuneLiteral, type StringLiteral, type BooleanLiteral, type NilLiteral } from "./expression";
import { type FunctionDeclaration, type MethodDeclaration } from "./declaration";

export type NodeGroup = DModeling.ObjectTagGroup<"node">;

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

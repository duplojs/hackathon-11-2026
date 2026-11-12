import type * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type IfStatement } from "./if";
import { type GoStatement, type DeferStatement } from "./call";
import { type BlockStatement } from "./block";
import { type SelectStatement } from "./select";
import { type ForStatement } from "./for";
import { type RangeStatement } from "./range";
import { type AssignmentStatement, type CompoundAssignmentStatement, type ShortVariableDeclarationStatement } from "./assignment";
import { type ExpressionSwitchStatement, type TypeSwitchStatement } from "./switch";
import { type ReturnStatement, type BreakStatement, type ContinueStatement, type GotoStatement, type FallthroughStatement, type LabeledStatement } from "./jump";
import { type SendStatement } from "./channel";
import { type VariableDeclarationZeroValue, type VariableDeclarationInitialized, type TypeDeclaration, type TypeAliasDeclaration, type ConstantDeclaration, type CallExpression, type ReceiveExpression } from "../shared";

export type SimpleStatement = (
	| CallExpression
	| ReceiveExpression
	| SendStatement
	| AssignmentStatement
	| CompoundAssignmentStatement
	| ShortVariableDeclarationStatement
);

export type Statement = (
	| VariableDeclarationZeroValue
	| VariableDeclarationInitialized
	| ConstantDeclaration
	| TypeDeclaration
	| TypeAliasDeclaration
	| SimpleStatement
	| BlockStatement
	| GoStatement
	| DeferStatement
	| ReturnStatement
	| BreakStatement
	| ContinueStatement
	| GotoStatement
	| FallthroughStatement
	| LabeledStatement
	| IfStatement
	| ForStatement
	| RangeStatement
	| ExpressionSwitchStatement
	| TypeSwitchStatement
	| SelectStatement
);

export type StatementGroup = readonly [
	NodeGroup,
	DModeling.ObjectTagGroup<"statement">,
];

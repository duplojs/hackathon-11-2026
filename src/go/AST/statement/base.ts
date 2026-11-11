import { type _Node } from "../base";
import { type LocalDeclaration } from "../declaration/base";
import { type AssignmentStatement, type CompoundAssignmentStatement, type ShortVariableDeclarationStatement } from "./assignment";
import { type BlockStatement } from "./block";
import { type GoStatement, type DeferStatement } from "./call";
import { type SendStatement } from "./channel";
import { type ExpressionStatement } from "./expression";
import { type ForStatement, type RangeStatement } from "./for";
import { type IfStatement } from "./if";
import { type BreakStatement, type ContinueStatement, type FallthroughStatement, type GotoStatement, type LabeledStatement, type ReturnStatement } from "./jump";
import { type SelectStatement } from "./select";
import { type ExpressionSwitchStatement, type TypeSwitchStatement } from "./switch";

export type SimpleStatement = (
	| ExpressionStatement
	| SendStatement
	| AssignmentStatement
	| CompoundAssignmentStatement
	| ShortVariableDeclarationStatement
);

export type Statement = (
	| LocalDeclaration
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

export interface _Statement<
	GenericNodeName extends string = string,
> extends _Node<GenericNodeName, "statement"> {

}

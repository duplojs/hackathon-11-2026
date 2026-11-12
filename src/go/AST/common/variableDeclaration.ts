import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type StatementGroup } from "../statement";
import { type Identifier } from "./identifier";
import { type TypeReference } from "./typeReference";
import { type Type } from "../type";
import { type Expression } from "../expression";
import { type DeclarationGroup } from "../declaration";

export type VariableType = (
	| TypeReference
	| Type
);

export interface VariableDeclarationZeroValue extends DModeling.ObjectTagWithGroup<
	"variable-zero-value",
	[NodeGroup, DeclarationGroup[1], StatementGroup[1]]
> {
	identifier: Identifier;
	typeReference: VariableType;
}

export const createVariableDeclarationZeroValue = DModeling.createTaggedObjectFactory<
	VariableDeclarationZeroValue
>("[node][declaration][statement]variable-zero-value");

export interface VariableDeclarationInitialized extends DModeling.ObjectTagWithGroup<
	"variable-initialized",
	[NodeGroup, DeclarationGroup[1], StatementGroup[1]]
> {
	identifier: Identifier;
	typeReference?: VariableType;
	initializer: Expression;
}

export const createVariableDeclarationInitialized = DModeling.createTaggedObjectFactory<
	VariableDeclarationInitialized
>("[node][declaration][statement]variable-initialized");

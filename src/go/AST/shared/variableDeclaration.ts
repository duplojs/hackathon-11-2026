import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type StatementGroup } from "../statement";
import { type Identifier, type TypeReference } from "../common";
import { type Type } from "../type";
import { type Expression } from "../expression";
import { type DeclarationGroup } from "../declaration";

export type VariableType = (
	| TypeReference
	| Type
);

export interface VariableDeclarationZeroValue extends DModeling.ObjectTagWithGroup<
	"variable-zero-value",
	[NodeGroup, DeclarationGroup, StatementGroup]
> {
	identifier: Identifier;
	typeReference: VariableType;
}

export const createVariableDeclarationZeroValue = DModeling.createTaggedObjectFactory<
	VariableDeclarationZeroValue
>("[node][declaration][statement]variable-zero-value");

export interface VariableDeclarationInitialized extends DModeling.ObjectTagWithGroup<
	"variable-initialized",
	[NodeGroup, DeclarationGroup, StatementGroup]
> {
	identifier: Identifier;
	typeReference?: VariableType;
	initializer: Expression;
}

export const createVariableDeclarationInitialized = DModeling.createTaggedObjectFactory<
	VariableDeclarationInitialized
>("[node][declaration][statement]variable-initialized");

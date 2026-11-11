import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier } from "../identifier";
import { type Expression } from "../expression/base";
import { type Type } from "../type/base";
import { type TypeReference } from "../type/reference";
import { type _Declaration } from "./base";

export type VariableType = (
	| TypeReference
	| Type
);

export interface VariableDeclarationZeroValue extends _Declaration<"variable-zero-value"> {
	identifier: Identifier;
	typeReference: VariableType;
}

export const variableDeclarationZeroValue = DModeling.createTaggedObjectFactory<
	VariableDeclarationZeroValue
>("[node][declaration]:variable-zero-value");

export interface VariableDeclarationInitialized extends _Declaration<"variable-initialized"> {
	identifier: Identifier;
	typeReference?: VariableType;
	initializer: Expression;
}

export const variableDeclarationInitialized = DModeling.createTaggedObjectFactory<
	VariableDeclarationInitialized
>("[node][declaration]:variable-initialized");

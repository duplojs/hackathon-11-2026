import { createFactory } from "../base";
import { type Identifier } from "../identifier";
import { type _Expression } from "../expression/base";
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

export const variableDeclarationZeroValue = createFactory<
	VariableDeclarationZeroValue
>("node-declaration-variable-zero-value");

export interface VariableDeclarationInitialized extends _Declaration<"variable-initialized"> {
	identifier: Identifier;
	typeReference?: VariableType;
	// Il manque une expression concrète : utiliser son union lorsque la famille sera définie.
	initializer: _Expression;
}

export const variableDeclarationInitialized = createFactory<
	VariableDeclarationInitialized
>("node-declaration-variable-initialized");

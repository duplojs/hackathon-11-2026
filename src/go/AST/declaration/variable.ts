import { createFactory, type Identifier } from "../base";
import { type _Expression } from "../expression/base";
import { type _Declaration } from "./base";

export interface VariableDeclarationZeroValue extends _Declaration<"variable-zero-value"> {
	identifier: Identifier;
	typeReference: Identifier;
}

export const variableDeclarationZeroValue = createFactory<
	VariableDeclarationZeroValue
>("node-declaration-variable-zero-value");

export interface VariableDeclarationInitialized extends _Declaration<"variable-initialized"> {
	identifier: Identifier;
	typeReference?: Identifier;
	initializer: _Expression;
}

export const variableDeclarationInitialized = createFactory<
	VariableDeclarationInitialized
>("node-declaration-variable-initialized");

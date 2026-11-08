import { createFactory, type Identifier } from "../base";
import { type _Type } from "../type/base";
import { type BlockStatement } from "../blockStatement";
import { type _Declaration } from "./base";

type Parameter = readonly [Identifier, Identifier | _Type];

export interface FunctionDeclaration extends _Declaration<"function"> {
	identifier: Identifier;
	parameters: readonly Parameter[];
	returnTypes: readonly(Identifier | _Type)[];
	body: BlockStatement;
}

export const functionDeclaration = createFactory<
	FunctionDeclaration
>("node-declaration-function");

export interface MethodDeclaration extends _Declaration<"method"> {
	identifier: Identifier;
	receiver: Parameter;
	parameters: readonly Parameter[];
	returnTypes: readonly (Identifier | _Type)[];
	body: BlockStatement;
}

export const methodDeclaration = createFactory<
	MethodDeclaration
>("node-declaration-method");

import { type _Node } from "../base";
import { type ConstantDeclaration } from "./constant";
import { type FunctionDeclaration, type MethodDeclaration } from "./function";
import { type ImportDeclaration } from "./import";
import { type TypeAliasDeclaration, type TypeDeclaration } from "./type";
import { type VariableDeclarationInitialized, type VariableDeclarationZeroValue } from "./variable";

export type LocalDeclaration = (
	| VariableDeclarationZeroValue
	| VariableDeclarationInitialized
	| ConstantDeclaration
	| TypeDeclaration
	| TypeAliasDeclaration
);

export type Declaration = (
	| LocalDeclaration
	| FunctionDeclaration
	| MethodDeclaration
	| ImportDeclaration
);

export interface _Declaration<
	GenericNodeName extends string = string,
> extends _Node<`declaration-${GenericNodeName}`> {

}

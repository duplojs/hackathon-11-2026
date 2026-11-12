import type * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type VariableDeclarationZeroValue, type VariableDeclarationInitialized, type TypeDeclaration, type TypeAliasDeclaration, type ConstantDeclaration } from "../common";
import { type FunctionDeclaration, type MethodDeclaration } from "./function";
import { type ImportDeclaration } from "./import";

export type Declaration = (
	| VariableDeclarationZeroValue
	| VariableDeclarationInitialized
	| ConstantDeclaration
	| TypeDeclaration
	| TypeAliasDeclaration
	| FunctionDeclaration
	| MethodDeclaration
	| ImportDeclaration
);

export type DeclarationGroup = readonly [
	NodeGroup,
	DModeling.ObjectTagGroup<"declaration">,
];

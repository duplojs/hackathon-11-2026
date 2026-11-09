
import { createFactory } from "../base";
import { type Identifier } from "../identifier";
import { type Type } from "../type/base";
import { type TypeParameter } from "../type/function";
import { type TypeReference } from "../type/reference";
import { type _Declaration } from "./base";

export type TypeDefinitionType = (
	| TypeReference
	| Type
);

export type TypeAliasType = (
	| TypeReference
	| Type
);

export interface TypeDefinition extends _Declaration<"type-definition"> {
	identifier: Identifier;
	generic?: readonly TypeParameter[];
	type: TypeDefinitionType;
}

export const typeDefinition = createFactory<
	TypeDefinition
>("node-declaration-type-definition");

export interface TypeAlias extends _Declaration<"type-alias"> {
	identifier: Identifier;
	generic?: readonly TypeParameter[];
	type: TypeAliasType;
}

export const typeAlias = createFactory<
	TypeAlias
>("node-declaration-type-alias");

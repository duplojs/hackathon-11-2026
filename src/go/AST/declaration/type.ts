
import { createFactory, type Identifier } from "../base";
import { type _Type } from "../type/base";
import { type _Declaration } from "./base";

export interface TypeDefinition extends _Declaration<"type-definition"> {
	identifier: Identifier;
	type: Identifier | _Type;
}

export const typeDefinition = createFactory<
	TypeDefinition
>("node-declaration-type-definition");

export interface TypeAlias extends _Declaration<"type-alias"> {
	identifier: Identifier;
	type: Identifier | _Type;
}

export const typeAlias = createFactory<
	TypeAlias
>("node-declaration-type-alias");

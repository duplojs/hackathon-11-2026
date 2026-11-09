import * as DModeling from "@duplojs/lang/modeling";

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

export interface TypeDeclaration extends _Declaration<"type-declaration"> {
	identifier: Identifier;
	generic?: readonly TypeParameter[];
	type: TypeDefinitionType;
}

export const typeDefinition = DModeling.createTaggedObjectFactory<
	TypeDeclaration
>("node-declaration-type-declaration");

export interface TypeAliasDeclaration extends _Declaration<"type-alias-declaration"> {
	identifier: Identifier;
	generic?: readonly TypeParameter[];
	type: TypeAliasType;
}

export const typeAlias = DModeling.createTaggedObjectFactory<
	TypeAliasDeclaration
>("node-declaration-type-alias-declaration");

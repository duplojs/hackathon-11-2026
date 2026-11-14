import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type StatementGroup } from "../statement";
import { type Identifier, type TypeReference } from "../common";
import { type TypeParameter, type Type } from "../type";
import { type DeclarationGroup } from "../declaration";

export type TypeDefinitionType = (
	| TypeReference
	| Type
);

export type TypeAliasType = (
	| TypeReference
	| Type
);

export interface TypeDeclaration extends DModeling.ObjectTagWithGroup<
	"type",
	[NodeGroup, DeclarationGroup, StatementGroup]
> {
	identifier: Identifier;
	generic?: readonly TypeParameter[];
	type: TypeDefinitionType;
}

export const createTypeDefinition = DModeling.createTaggedObjectFactory<
	TypeDeclaration
>("[node][declaration][statement]type");

export interface TypeAliasDeclaration extends DModeling.ObjectTagWithGroup<
	"type-alias",
	[NodeGroup, DeclarationGroup, StatementGroup]
> {
	identifier: Identifier;
	generic?: readonly TypeParameter[];
	type: TypeAliasType;
}

export const createTypeAlias = DModeling.createTaggedObjectFactory<
	TypeAliasDeclaration
>("[node][declaration][statement]type-alias");

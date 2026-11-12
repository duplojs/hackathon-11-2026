import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type StatementGroup } from "../statement";
import { type Identifier } from "./identifier";
import { type TypeReference } from "./typeReference";
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
	[NodeGroup, DeclarationGroup[1], StatementGroup[1]]
> {
	identifier: Identifier;
	generic?: readonly TypeParameter[];
	type: TypeDefinitionType;
}

export const typeDefinition = DModeling.createTaggedObjectFactory<
	TypeDeclaration
>("[node][declaration][statement]type");

export interface TypeAliasDeclaration extends DModeling.ObjectTagWithGroup<
	"type-alias",
	[NodeGroup, DeclarationGroup[1], StatementGroup[1]]
> {
	identifier: Identifier;
	generic?: readonly TypeParameter[];
	type: TypeAliasType;
}

export const typeAlias = DModeling.createTaggedObjectFactory<
	TypeAliasDeclaration
>("[node][declaration][statement]type-alias");

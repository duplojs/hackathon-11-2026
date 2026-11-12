import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier } from "../common";
import { type DeclarationGroup } from "./base";

export interface ImportDeclaration extends DModeling.ObjectTagWithGroup<"import", DeclarationGroup> {
	path: string;
	alias?: Identifier | ".";
}

export const importDeclaration = DModeling.createTaggedObjectFactory<
	ImportDeclaration
>("[node][declaration]import");

import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type Identifier } from "./identifier";

export interface ImportDeclaration extends DModeling.ObjectTagWithGroup<"import", NodeGroup> {
	path: string;
	alias?: Identifier | ".";
}

export const createImportDeclaration = DModeling.createTaggedObjectFactory<
	ImportDeclaration
>("[node]import");

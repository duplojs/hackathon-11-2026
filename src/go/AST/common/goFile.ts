import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type Identifier } from "./identifier";
import { type ImportDeclaration } from "./import";
import { type Declaration } from "../declaration";

export interface GoFile extends DModeling.ObjectTagWithGroup<"file", NodeGroup> {
	packageName: Identifier;
	imports: readonly ImportDeclaration[];
	declarations: readonly Declaration[];
}

export const goFile = DModeling.createTaggedObjectFactory<GoFile>(
	"[node]file",
);

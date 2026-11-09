import { createFactory } from "./base";
import { type Identifier } from "./identifier";
import { type ImportDeclaration } from "./declaration/import";
import type * as DModeling from "@duplojs/lang/modeling";

export type TopLevelDeclaration = (
	never
);

export interface GoFile extends DModeling.ObjectTag<"file"> {
	packageName: Identifier;
	imports: readonly ImportDeclaration[];
	declarations: readonly TopLevelDeclaration[];
}

export const goFile = createFactory<GoFile>(
	"file",
);

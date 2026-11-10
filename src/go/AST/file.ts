import * as DModeling from "@duplojs/lang/modeling";
import { type Identifier } from "./identifier";
import { type ImportDeclaration } from "./declaration/import";
import { type LocalDeclaration } from "./declaration/base";
import { type FunctionDeclaration, type MethodDeclaration } from "./declaration/function";
import { type Statement } from "./statement/base";

export type TopLevelDeclaration = (
	| LocalDeclaration
	| FunctionDeclaration
	| MethodDeclaration
);

export interface GoFile extends DModeling.ObjectTag<"file"> {
	packageName: Identifier;
	imports: readonly ImportDeclaration[];
	declarations: readonly TopLevelDeclaration[];
	init: readonly Statement[];
}

export const goFile = DModeling.createTaggedObjectFactory<GoFile>(
	"file",
);

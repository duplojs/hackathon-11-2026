import * as DModeling from "@duplojs/lang/modeling";
import { type NodeGroup } from "..";
import { type VariableDeclarationZeroValue, type VariableDeclarationInitialized } from "./variableDeclaration";
import { type Identifier } from "./identifier";
import { type TypeDeclaration, type TypeAliasDeclaration } from "./typeDeclaration";
import { type ConstantDeclaration } from "./constantDeclaration";
import { type FunctionDeclaration, type MethodDeclaration, type ImportDeclaration } from "../declaration";

export type TopLevelDeclaration = (
	| VariableDeclarationZeroValue
	| VariableDeclarationInitialized
	| ConstantDeclaration
	| TypeDeclaration
	| TypeAliasDeclaration
	| FunctionDeclaration
	| MethodDeclaration
);

export interface GoFile extends DModeling.ObjectTagWithGroup<"file", NodeGroup> {
	packageName: Identifier;
	imports: readonly ImportDeclaration[];
	topLevelDeclarations: readonly TopLevelDeclaration[];
}

export const goFile = DModeling.createTaggedObjectFactory<GoFile>(
	"[node]file",
);

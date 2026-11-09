
import { createFactory } from "../base";
import { type Identifier } from "../identifier";
import { type _Declaration } from "./base";

export interface ImportDeclaration extends _Declaration<"import"> {
	path: string;
	alias?: Identifier | ".";
}

export const importDeclaration = createFactory<
	ImportDeclaration
>("node-declaration-import");

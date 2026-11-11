import * as DModeling from "@duplojs/lang/modeling";

import { type Identifier } from "../identifier";
import { type _Declaration } from "./base";

export interface ImportDeclaration extends _Declaration<"import"> {
	path: string;
	alias?: Identifier | ".";
}

export const importDeclaration = DModeling.createTaggedObjectFactory<
	ImportDeclaration
>("[node][declaration]:import");

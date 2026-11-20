import * as DModeling from "@duplojs/lang/modeling";
import type * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { goModulePath } from "../sourcePackage";

/** Fichier Go écrit à la main (runtime), copié tel quel dans shard_dependencies. */
export interface SharedDependencyGoFile {
	readonly fileName: string;
	readonly sourcePath: string & DPath.Absolute;
}

export interface SharedDependency extends DModeling.ObjectTag<"SharedDependency"> {
	readonly imports: readonly GoAST.ImportDeclaration[];
	readonly declarations: readonly GoAST.Declaration[];
	readonly init: readonly GoAST.Statement[];
	readonly goFiles: readonly SharedDependencyGoFile[];
}

export const createSharedDependency = DModeling.createTaggedObjectFactory<SharedDependency>(
	"SharedDependency",
);

export const sharedDependencyPackageName = GoAST.createIdentifier("shard_dependencies");

export const sharedDependencyImportDeclaration = GoAST.createImportDeclaration({
	path: `${goModulePath}/${sharedDependencyPackageName.value}`,
});

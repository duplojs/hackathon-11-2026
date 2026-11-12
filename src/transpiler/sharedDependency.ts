import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { goModulePath } from "./sourcePackage";

export interface SharedDependency extends DModeling.ObjectTag<"SharedDependency"> {
	readonly imports: readonly GoAST.ImportDeclaration[];
	readonly declarations: readonly GoAST.Declaration[];
	readonly init: readonly GoAST.Statement[];
}

export const createSharedDependency = DModeling.createTaggedObjectFactory<SharedDependency>(
	"SharedDependency",
);

export const sharedDependencyPackageName = GoAST.createIdentifier("shard_dependencies");

export const sharedDependencyImportDeclaration = GoAST.importDeclaration({
	path: `${goModulePath}/${sharedDependencyPackageName.value}`,
});

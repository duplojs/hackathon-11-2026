import * as DModeling from "@duplojs/lang/modeling";
import * as GO from "@go";
import { goModulePath } from "./sourcePackage";

export interface SharedDependency extends DModeling.ObjectTag<"SharedDependency"> {
	readonly imports: readonly GO.AST.ImportDeclaration[];
	readonly topLevelDeclarations: readonly GO.AST.TopLevelDeclaration[];
	readonly init: readonly GO.AST.Statement[];
}

export const createSharedDependency = DModeling.createTaggedObjectFactory<SharedDependency>(
	"SharedDependency",
);

export const sharedDependencyPackageName = GO.AST.createIdentifier("shard_dependencies");

export const sharedDependencyImportDeclaration = GO.AST.importDeclaration({
	path: `${goModulePath}/${sharedDependencyPackageName.value}`,
});

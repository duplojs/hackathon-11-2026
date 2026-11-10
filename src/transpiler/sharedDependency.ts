import * as DModeling from "@duplojs/lang/modeling";
import type * as GO from "@go";

export interface SharedDependency extends DModeling.ObjectTag<"SharedDependency"> {
	readonly name: string;
	readonly imports: readonly GO.AST.ImportDeclaration[];
	readonly topLevelDeclarations: readonly GO.AST.TopLevelDeclaration[];
}

export const createSharedDependency = DModeling.createTaggedObjectFactory<SharedDependency>(
	"SharedDependency",
);

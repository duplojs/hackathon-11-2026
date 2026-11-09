import * as DModeling from "@duplojs/lang/modeling";
import type * as GO from "@go";

export interface ConstantDependency extends DModeling.ObjectTag<"ConstantDependency"> {
	readonly name: string;
	readonly imports: readonly GO.AST.ImportDeclaration[];
	readonly topLevelDeclarations: readonly GO.AST.TopLevelDeclaration[];
}

export const createConstantDependency = DModeling.createTaggedObjectFactory<ConstantDependency>(
	"ConstantDependency",
);

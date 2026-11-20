import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { undefinedShardDependency } from "../../sharedDependency/defaults/undefined";

export const undefinedTypeTransformer: Transformer<GoAST.PackageTypeReference> = createTransformer(
	(node, context) => {
		if (node.kind !== TsAST.SyntaxKind.UndefinedKeyword) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.createPackageTypeReference({
				packageName: context.registerSharedDependency(undefinedShardDependency.value),
				identifier: GoAST.createIdentifier("JSUndefined"),
			}),
		});
	},
);

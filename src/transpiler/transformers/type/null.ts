import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { nullShardDependency } from "../../sharedDependency/defaults/null";

export const nullTypeTransformer: Transformer<GoAST.PackageTypeReference> = createTransformer(
	(node, context) => {
		if (node.kind !== TsAST.SyntaxKind.NullKeyword) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.createPackageTypeReference({
				packageName: context.registerSharedDependency(nullShardDependency.value),
				identifier: GoAST.createIdentifier("JSNull"),
			}),
		});
	},
);

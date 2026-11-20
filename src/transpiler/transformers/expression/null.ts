import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { nullShardDependency, nullTypeIdentifier } from "../../sharedDependency/defaults";

// La valeur `null` devient l'unique valeur du type `JSNull`.
export const nullLiteralTransformer: Transformer<GoAST.StructLiteral> = createTransformer(
	(node, context) => {
		if (node.kind !== TsAST.SyntaxKind.NullKeyword) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.createStructLiteral({
				typeReference: GoAST.createPackageTypeReference({
					packageName: context.registerSharedDependency(nullShardDependency.value),
					identifier: nullTypeIdentifier,
				}),
				elements: [],
			}),
		});
	},
);

import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import {
	nullShardDependency,
	nullTypeIdentifier,
	undefinedShardDependency,
	undefinedTypeIdentifier,
} from "../../sharedDependency/defaults";

// `null` et `undefined` n'ont qu'une valeur : ils deviennent les structs vides `JSNull` et
// `JSUndefined` du runtime partagé, qui gardent la distinction entre les deux (affichage, JSON).
export const nullishTypeTransformer: Transformer<GoAST.PackageTypeReference> = createTransformer(
	(node, context) => {
		const isNull = TsAST.isLiteralTypeNode(node) && node.literal.kind === TsAST.SyntaxKind.NullKeyword;
		const isUndefined = node.kind === TsAST.SyntaxKind.UndefinedKeyword;

		if (!isNull && !isUndefined) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.createPackageTypeReference({
				packageName: context.registerSharedDependency(
					isNull ? nullShardDependency.value : undefinedShardDependency.value,
				),
				identifier: isNull ? nullTypeIdentifier : undefinedTypeIdentifier,
			}),
		});
	},
);

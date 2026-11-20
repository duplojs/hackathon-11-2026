import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { nullShardDependency } from "../../sharedDependency/defaults/null";
import { undefinedShardDependency } from "../../sharedDependency/defaults/undefined";

/**
 * `undefined` et `null` comme TYPES (ADR-13) : JSUndefined et JSNull, des structs
 * vides. Seuls, ils ne portent rien ; dans une union (`T | undefined`), ils
 * deviennent des membres de l'union étiquetée.
 */
export const nullishTypeTransformer: Transformer<GoAST.PackageTypeReference> = createTransformer(
	(node, context) => {
		const isUndefined = node.kind === TsAST.SyntaxKind.UndefinedKeyword;
		const isNull = TsAST.isLiteralTypeNode(node) && node.literal.kind === TsAST.SyntaxKind.NullKeyword;

		if (!isUndefined && !isNull) {
			return context.notSupport();
		}

		const packageName = context.registerSharedDependency(
			isUndefined ? undefinedShardDependency.value : nullShardDependency.value,
		);

		return context.success({
			result: GoAST.createPackageTypeReference({
				packageName,
				identifier: GoAST.createIdentifier(isUndefined ? "JSUndefined" : "JSNull"),
			}),
		});
	},
);

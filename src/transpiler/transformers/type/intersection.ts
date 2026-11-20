import * as DArray from "@duplojs/lang/array";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import type { GoType } from "./checkerType";

const primitiveKinds: readonly TsAST.SyntaxKind[] = [
	TsAST.SyntaxKind.StringKeyword,
	TsAST.SyntaxKind.NumberKeyword,
	TsAST.SyntaxKind.BooleanKeyword,
];

// Partie d'une intersection qui existe à l'exécution : une primitive ou un tableau.
function isRuntimeMember(typeNode: TsAST.TypeNode) {
	return DArray.includes(primitiveKinds, typeNode.kind)
		|| TsAST.isArrayTypeNode(typeNode)
		|| TsAST.isTupleTypeNode(typeNode)
		|| (TsAST.isTypeOperatorNode(typeNode) && typeNode.operator === TsAST.SyntaxKind.ReadonlyKeyword);
}

// Une intersection entre une valeur (primitive ou tableau) et des types « marqueurs » DuploJS
// (`string & Number` produit par `DString.to`, `readonly string[] & LengthEqual<1>` produit par
// `DArray.map` sur un tuple) n'existe qu'à la compilation : à l'exécution la valeur reste la
// même. L'intersection prend donc la représentation de cette valeur. Les autres ne sont pas traduites.
export const intersectionTypeTransformer: Transformer<GoType> = createTransformer(
	(node, context) => {
		if (!TsAST.isIntersectionTypeNode(node)) {
			return context.notSupport();
		}

		const runtimeMembers = DArray.filter(node.types, isRuntimeMember);
		const markers = DArray.filter(node.types, (typeNode) => !isRuntimeMember(typeNode));

		const [runtimeMember] = runtimeMembers;

		if (
			!runtimeMember
			|| !DArray.lengthEqual(runtimeMembers, 1)
			|| !DArray.every(markers, (marker) => TsAST.isTypeReferenceNode(marker))
		) {
			return context.error(node, "intersection-not-supported");
		}

		return context.transform(runtimeMember, typeTransformers.value);
	},
);

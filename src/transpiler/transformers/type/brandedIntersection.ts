import { type GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../context/build";
import { typeTransformers } from ".";

/** Vrai si `member` est un type de `@duplojs/lang` utilisé comme « étiquette » (contrainte). */
async function isDuploJSBrand(member: TsAST.TypeNode, context: BuildContext) {
	if (!TsAST.isTypeReferenceNode(member) && !TsAST.isImportTypeNode(member)) {
		return false;
	}

	const moduleReference = await DCommon.asyncPipe(
		context.resolveReferenceModule(
			TsAST.isTypeReferenceNode(member) ? member.typeName : member,
			"@duplojs/lang",
			/^dist\//,
		),
		DEither.unwrapRight,
	);

	return !DEither.isLeft(moduleReference);
}

/**
 * Types « marqués » de DuploJS : `X & Étiquette`.
 *
 * DuploJS colle des étiquettes de contrainte sur certaines valeurs, qui
 * n'existent qu'à la compilation :
 * - `DString.to(n)` sur un `number` renvoie `string & Number` ;
 * - `DArray.map` renvoie `readonly T[] & <contraintes du tableau d'entrée>`
 *   (`ReapplyCompatiblesConstraints`).
 * À l'exécution, la valeur est une string ou un tableau ordinaire : on garde le
 * seul membre qui n'est pas une étiquette de `@duplojs/lang`, et on l'ignore.
 *
 * Limite : il faut exactement UN membre qui ne soit pas une étiquette DuploJS.
 * Les autres intersections restent une erreur.
 */
export const brandedIntersectionTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIntersectionTypeNode(node)) {
			return context.notSupport();
		}

		const realMembers: TsAST.TypeNode[] = [];

		for (const member of node.types) {
			if (!await isDuploJSBrand(member, context)) {
				realMembers.push(member);
			}
		}

		const [real] = realMembers;

		if (!real || realMembers.length !== 1) {
			return context.notSupport();
		}

		return context.transform(real, typeTransformers.value);
	},
);

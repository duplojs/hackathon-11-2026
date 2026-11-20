import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import { resolveEitherTypeMember } from "../duplojs/either/eitherType";

/**
 * Exception documentée à la décision n°6 (« jamais de any »).
 *
 * Une union qui mélange un Either et une valeur qui n'en est pas un, par exemple
 * le résultat de `DEither.whenIsRight(result, DArray.coalescing)` :
 *
 *   DEither.Fail | readonly [number]
 *
 * Aucun type Go précis ne peut contenir « un Either OU un tableau ». C'est le TS
 * lui-même qui mélange deux types sans rapport : on utilise `any`, seulement dans
 * ce cas précis. Toute autre union inconnue reste une erreur.
 */
export const mixedEitherUnionTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isUnionTypeNode(node)) {
			return context.notSupport();
		}

		const resolvedMembers = await DCommon.asyncPipe(
			node.types,
			DArray.map((member) => resolveEitherTypeMember(member, context)),
			DCommon.promiseAll,
		);

		const eitherCount = DArray.filter(resolvedMembers, (member) => member !== undefined).length;

		// Il faut au moins un Either ET au moins un membre qui n'en est pas un.
		if (eitherCount === 0 || eitherCount === resolvedMembers.length) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.any,
		});
	},
);

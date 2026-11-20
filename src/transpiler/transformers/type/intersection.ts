import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoPrinter } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../context/build";
import { typeTransformers } from ".";
import { type GoType } from "./goTypeOf";

// Contrainte DuploJS purement typée (marque) : `LengthEqual<1>` sur un tableau,
// `Number` sur une chaîne produite par DString.to… Reconnue par symbole résolu dans
// @duplojs/lang, hors Either. Elle n'existe pas à l'exécution : rien à traduire.
async function isDuploJSConstraint(node: TsAST.TypeNode, context: BuildContext) {
	if (!TsAST.isTypeReferenceNode(node)) {
		return false;
	}

	const moduleReference = DEither.unwrapRight(
		await context.resolveReferenceModule(node.typeName, "@duplojs/lang"),
	);

	return !DEither.isLeft(moduleReference) && !moduleReference.entry.startsWith("dist/either/");
}

/**
 * Intersection `A & B` : les contraintes DuploJS (marques de type) sont ignorées ;
 * les autres membres doivent tous avoir le même type Go (ex. `readonly string[] &
 * LengthEqual<1>` : `[]string`). Sinon : notSupport (pas d'équivalent Go).
 */
export const intersectionTypeTransformer: Transformer<GoType> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIntersectionTypeNode(node)) {
			return context.notSupport();
		}

		const memberTypes = await DCommon.asyncPipe(
			node.types,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<readonly GoType[]>([]),
				async({ item, lastValue, next, exit }) => {
					if (await isDuploJSConstraint(item, context)) {
						return next(lastValue);
					}

					const memberType = DEither.unwrapRight(await context.transform(item, typeTransformers.value));

					if (DEither.isLeft(memberType)) {
						return exit(memberType);
					}

					return next(DArray.push(lastValue, memberType.result));
				},
			),
		);

		if (DEither.isLeft(memberTypes)) {
			return memberTypes;
		}

		const [first, ...others] = memberTypes;

		if (!first || DArray.some(others, (other) => GoPrinter.renderNode(other) !== GoPrinter.renderNode(first))) {
			return context.notSupport();
		}

		return context.success({ result: first });
	},
);

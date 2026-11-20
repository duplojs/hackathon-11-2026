import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import type { BuildContext } from "../../../context/build";

/**
 * Détecte si un TypeNode TypeScript représente un `Either` (@duplojs/lang)
 * via la résolution de module sémantique ou les clés Kind.
 */
async function isEitherTypeNode(
	node: TsAST.TypeNode,
	context: BuildContext,
): Promise<boolean> {
	if (TsAST.isUnionTypeNode(node)) {
		for (const member of node.types) {
			if (await isEitherTypeNode(member, context)) {
				return true;
			}
		}
		return false;
	}

	if (TsAST.isTypeReferenceNode(node)) {
		const modRef = await DCommon.asyncPipe(
			context.resolveReferenceModule(node.typeName, "@duplojs/lang", /^dist\/either\//),
			DEither.unwrapRight,
		);
		if (!DEither.isLeft(modRef)) {
			return true;
		}
	}

	if (TsAST.isImportTypeNode(node)) {
		const modRef = await DCommon.asyncPipe(
			context.resolveReferenceModule(node, "@duplojs/lang", /^dist\/either\//),
			DEither.unwrapRight,
		);
		if (!DEither.isLeft(modRef)) {
			return true;
		}
	}

	return false;
}

/**
 * Détecte si un type TypeScript représente un `Either` (@duplojs/lang)
 * via la résolution de module sémantique et les clés Kind (@DuplojsLangEither/*),
 * éliminant toute comparaison textuelle fragile sur les chaînes de types.
 */
export async function isEitherType(
	type: Type,
	location: TsAST.Node,
	context: BuildContext,
): Promise<boolean> {
	const { typeChecker } = context.transpilation;

	// 1. Inspection via le TypeNode correspondant (gère les unions et alias)
	const typeNode = await typeChecker.typeToTypeNode(type, location);
	if (typeNode && await isEitherTypeNode(typeNode, context)) {
		return true;
	}

	// 2. Détection par propriétés Kind (@DuplojsLangEither/*)
	const properties = await typeChecker.getPropertiesOfType(type);
	for (const property of properties) {
		if (property.name.startsWith("@DuplojsLangEither/")) {
			return true;
		}
	}

	return false;
}

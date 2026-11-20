import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type GoAST, GoPrinter } from "@go";
import { type NotfoundTransformer, type TransformationError, type TransformationSuccess } from "@transformer";
import { TsAST } from "@typescript";
import { SymbolFlags, type Type } from "typescript/async";
import { type BuildContext } from "../../context/build";
import { typeTransformers } from ".";
import { canNarrowUnion, getUnionMemberGoTypes } from "./taggedUnion";

export type GoType = GoAST.Type | GoAST.TypeReference;

/**
 * Contrat Sprint 2 (P4) : traduit un Type du checker en type Go.
 *
 * - `type` : le Type TS (getTypeAtLocation, getContextualType, type de retour…).
 * - `site` : le nœud TS où le type est utilisé ; il sert d'enclosingDeclaration à
 *   typeToTypeNode (noms qualifiés résolus depuis ce fichier) et de nœud d'erreur.
 *
 * Passe par typeToTypeNode puis typeTransformers : fonctionne donc pour les types
 * inférés, dont les nœuds sont synthétiques (getTypeFromTypeNode échoue sur eux).
 * Un type ne produit jamais de `before` : sinon, erreur.
 *
 * Usage : `DCommon.asyncPipe(goTypeOf(type, site, context), DEither.unwrapRight)`
 * donne `{ before: [], result: GoType }` ou un Left à propager.
 */
export async function goTypeOf(
	type: Type,
	site: TsAST.Node,
	context: BuildContext,
): Promise<TransformationSuccess<GoType> | TransformationError | NotfoundTransformer> {
	// T1 : un même type TS est traduit une fois par fichier. La clé contient le
	// fichier, car la traduction enregistre aussi les imports Go de ce fichier ;
	// seules les réussites sont gardées (un échec porte la position de son site).
	const cacheKey = `${type.id}|${context.file.currentFilePath}`;
	const cached = context.transpilation.typeCache.get(cacheKey) as TransformationSuccess<GoType> | undefined;

	if (cached) {
		return cached;
	}

	const result = await translateType(type, site, context);

	if (!DEither.isLeft(result)) {
		context.transpilation.typeCache.set(cacheKey, result);
	}

	return result;
}

async function translateType(
	type: Type,
	site: TsAST.Node,
	context: BuildContext,
): Promise<TransformationSuccess<GoType> | TransformationError | NotfoundTransformer> {
	const typeNode = await context.transpilation.typeChecker.typeToTypeNode(type, site, 1 /* NoTruncation */);

	if (!typeNode) {
		return context.error(site, "unable-to-create-type-node");
	}

	const goType = await context.transform(typeNode, typeTransformers.value);
	const unwrapped = DEither.unwrapRight(goType);

	// C2 : un échec sur un nœud de type SYNTHÉTIQUE est rapporté sur le site réel,
	// avec le type TS en clair (sinon : nœud sans position ni texte exploitable).
	if (DEither.isLeft(unwrapped) && DEither.hasInformation(unwrapped, "notfound-transformer")) {
		return context.error(site, {
			code: "unsupported-type",
			type: await context.transpilation.typeChecker.typeToString(type),
			unsupportedNode: DEither.unwrapLeft(unwrapped).kind,
		});
	}

	if (DEither.isLeft(unwrapped)) {
		return unwrapped;
	}

	if (!DArray.lengthEqual(unwrapped.before, 0)) {
		return context.error(site, "un-support-before-on-type");
	}

	return DCommon.cast(goType);
}

/**
 * Contrat Sprint 3 (D16) : type Go d'une EXPRESSION telle que traduite.
 * Pour un identifiant de variable ou de paramètre : le type DÉCLARÉ (le type Go de
 * la variable), pas le type rétréci par un `if` (après `isLeft(x)`, TypeScript voit
 * `Fail`, mais la variable Go reste `Either[float64]`). Sinon : le type de l'expression.
 */
/**
 * ADR-13 : lecture d'une variable de type UNION ÉTIQUETÉE que TypeScript a
 * rétrécie à cet endroit (`typeof x === "string"`, `x !== undefined`…).
 * Renvoie le type déclaré et le type rétréci, ou `undefined` (pas d'union
 * étiquetée, pas de rétrécissement, ou rétrécissement non représentable).
 * Les variables Either (D16) ne sont pas concernées : leur type Go reste déclaré.
 */
export async function resolveNarrowedUnionRead(
	node: TsAST.Identifier,
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;
	const symbol = await typeChecker.getSymbolAtLocation(node);

	if (!symbol || (symbol.flags & SymbolFlags.Variable) === 0) {
		return undefined;
	}

	const declaredType = await typeChecker.getTypeOfSymbol(symbol);

	if (!declaredType.isUnionType()) {
		return undefined;
	}

	const flowType = await typeChecker.getTypeAtLocation(node);

	if (flowType.id === declaredType.id) {
		return undefined;
	}

	const declared = DEither.unwrapRight(await goTypeOf(declaredType, node, context));

	if (DEither.isLeft(declared) || DEither.isLeft(getUnionMemberGoTypes(declared.result))) {
		return undefined;
	}

	const narrowed = DEither.unwrapRight(await goTypeOf(flowType, node, context));

	if (
		DEither.isLeft(narrowed)
		|| GoPrinter.renderNode(narrowed.result) === GoPrinter.renderNode(declared.result)
		|| !canNarrowUnion(declared.result, narrowed.result)
	) {
		return undefined;
	}

	return {
		declared: declared.result,
		narrowed: narrowed.result,
	};
}

const expressionGoTypes = new WeakMap<TsAST.Node, TransformationSuccess<GoType>>();

/**
 * T1 : type Go d'une expression, calculé une fois par nœud (plusieurs
 * transformers le demandent pour le même nœud : égalité, arguments, retour…).
 */
export async function goTypeOfExpression(
	node: TsAST.Expression,
	context: BuildContext,
): Promise<TransformationSuccess<GoType> | TransformationError | NotfoundTransformer> {
	const cached = expressionGoTypes.get(node);

	if (cached) {
		return cached;
	}

	const result = await computeGoTypeOfExpression(node, context);

	if (!DEither.isLeft(result)) {
		expressionGoTypes.set(node, result);
	}

	return result;
}

async function computeGoTypeOfExpression(
	node: TsAST.Expression,
	context: BuildContext,
): Promise<TransformationSuccess<GoType> | TransformationError | NotfoundTransformer> {
	const { typeChecker } = context.transpilation;
	const narrowedRead = TsAST.isIdentifier(node)
		? await resolveNarrowedUnionRead(node, context)
		: undefined;

	if (narrowedRead) {
		return DCommon.cast(context.success({ result: narrowedRead.narrowed }));
	}

	const symbol = TsAST.isIdentifier(node)
		? await typeChecker.getSymbolAtLocation(node)
		: undefined;

	const type = symbol && (symbol.flags & SymbolFlags.Variable) !== 0
		? await typeChecker.getTypeOfSymbol(symbol)
		: await typeChecker.getTypeAtLocation(node);

	return goTypeOf(type, node, context);
}

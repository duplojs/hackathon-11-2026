import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { SymbolFlags } from "typescript/async";
import { type BuildContext } from "../../context/build";
import { typeTransformers } from ".";
import { type GoType } from "./goTypeOf";

// Déclaré dans une bibliothèque standard de TypeScript (lib.es5.d.ts, lib.es2015.promise.d.ts…).
function isStandardLibraryPath(path: string) {
	return /(?:^|\/)lib\.[\w.]*\.d\.ts$/.test(path);
}

// Symbole de la référence : nœud réel (position connue) ou nœud synthétique produit
// par typeToTypeNode (type de retour inféré), résolu par son nom dans le fichier courant.
async function resolveTypeReferenceSymbol(node: TsAST.TypeReferenceNode, context: BuildContext) {
	const { typeChecker } = context.transpilation;

	if (!TsAST.isIdentifier(node.typeName)) {
		return undefined;
	}

	const symbol = node.typeName.pos >= 0
		? await typeChecker.getSymbolAtLocation(node.typeName)
		: await typeChecker.resolveName(node.typeName.text, SymbolFlags.Type, context.file.sourceFile);

	return symbol && (symbol.flags & SymbolFlags.Alias ? typeChecker.getAliasedSymbol(symbol) : symbol);
}

/**
 * `Promise<T>` (ADR-5, option A : exécution synchrone séquentielle) : le type Go de T.
 * Reconnu PAR SYMBOLE : le symbole global déclaré dans une lib standard de TypeScript.
 * Un type utilisateur nommé `Promise` n'est pas concerné.
 */
export const promiseTypeTransformer: Transformer<GoType> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTypeReferenceNode(node) || node.typeArguments?.length !== 1) {
			return context.notSupport();
		}

		const symbol = await resolveTypeReferenceSymbol(node, context);

		if (
			symbol?.name !== "Promise"
			|| !DArray.some(symbol.declarations, ({ path }) => isStandardLibraryPath(path))
		) {
			return context.notSupport();
		}

		const [valueTypeNode] = node.typeArguments;

		if (!valueTypeNode) {
			return context.notSupport();
		}

		const valueType = DEither.unwrapRight(await context.transform(valueTypeNode, typeTransformers.value));

		if (DEither.isLeft(valueType)) {
			return valueType;
		}

		return context.success({ result: valueType.result });
	},
);

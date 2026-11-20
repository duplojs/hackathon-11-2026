import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import { type BuildContext } from "../../context/build";
import { typeTransformers } from ".";

/**
 * Traduit un type connu du checker (type d'une expression, d'un paramètre…)
 * en type Go : le checker le réécrit en nœud de type TypeScript, puis les
 * transformers de types habituels le traduisent.
 * Sert quand le source n'écrit pas le type : ternaire, paramètre de callback,
 * résultat de `matchInformation`.
 */
export async function transformCheckerType(
	type: Type,
	location: TsAST.Node,
	context: BuildContext,
) {
	const typeNode = await context.transpilation.typeChecker.typeToTypeNode(type, location)
		?? TsAST.factory.createKeywordTypeNode(TsAST.SyntaxKind.AnyKeyword);

	return context.transform(typeNode, typeTransformers.value);
}

import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { getDeclaredName, resolveCurrentFileTopLevelName } from "../../resolvedReference";
import { isMergedPackage } from "../../moduleGraph";
import { type BuildContext } from "../../context/build";
import { resolveNarrowedUnionRead } from "../type/goTypeOf";
import { narrowUnionExpression } from "../type/taggedUnion";

export const identifierTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIdentifier(node)) {
			return context.notSupport();
		}

		const reference = await transformIdentifierReference(node, context);
		const narrowedRead = DEither.isLeft(reference)
			? undefined
			: await resolveNarrowedUnionRead(node, context);

		if (!narrowedRead || DEither.isLeft(reference)) {
			return reference;
		}

		// ADR-13 : union étiquetée rétrécie par TypeScript à cet endroit.
		const narrowed = narrowUnionExpression(
			DEither.unwrapRight(reference).result,
			narrowedRead.declared,
			narrowedRead.narrowed,
			context,
		);

		return DEither.isLeft(narrowed)
			? context.error(node, "narrowed-union-read-not-supported")
			: narrowed;
	},
);

export async function transformIdentifierReference(node: TsAST.Identifier, context: BuildContext) {
	const dependencyFile = DEither.unwrapRight(await context.resolveDependencyFile(node));

	if (DEither.isLeft(dependencyFile)) {
		const { currentFilePath } = context.file;

		// Package fusionné (cycle d'imports) : les noms de premier niveau portent
		// la clé du fichier, y compris dans le fichier qui les déclare.
		if (isMergedPackage(context.transpilation.moduleGraph, currentFilePath)) {
			const topLevelName = DEither.unwrapRight(await resolveCurrentFileTopLevelName(node, context));

			if (!DEither.isLeft(topLevelName)) {
				return context.success({
					result: context.createTopLevelIdentifier(currentFilePath, topLevelName),
				});
			}
		}

		return context.success({
			result: context.createSourceIdentifier(node.text),
		});
	}

	const packageIdentifier = context.registerDependencyFile(dependencyFile);
	// Nom DÉCLARÉ dans le fichier source : `import { add as plus }` désigne `add`.
	const memberIdentifier = context.createTopLevelIdentifier(
		dependencyFile.filePath,
		await getDeclaredName(dependencyFile.symbol),
	);

	return context.success({
		result: packageIdentifier
			? GoAST.createSelectorExpression({
				target: packageIdentifier,
				identifier: memberIdentifier,
			})
			: memberIdentifier,
	});
}

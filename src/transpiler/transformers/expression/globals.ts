import * as DArray from "@duplojs/lang/array";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import {
	jsInfinityFunctionIdentifier,
	jsNaNFunctionIdentifier,
	numberSharedDependency,
} from "../../sharedDependency/defaults/number";
import { undefinedShardDependency } from "../../sharedDependency/defaults/undefined";

const jsUndefinedIdentifier = GoAST.createIdentifier("JSUndefined");

// Déclaré dans une bibliothèque standard de TypeScript (lib.es5.d.ts…), pas dans le projet.
function isStandardLibraryPath(path: string) {
	return /(?:^|\/)lib\.[\w.]*\.d\.ts$/.test(path);
}

/**
 * Globaux de JS reconnus PAR SYMBOLE (D17), pas par leur texte : une variable
 * locale nommée `NaN` reste une variable.
 * - NaN : JSNaN() ; Infinity : JSInfinity() (`-Infinity` : préfixe unaire) ;
 * - undefined : JSUndefined{} (symbole intrinsèque, sans déclaration).
 */
export const globalIdentifierTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIdentifier(node) || !["NaN", "Infinity", "undefined"].includes(node.text)) {
			return context.notSupport();
		}

		const symbol = await context.transpilation.typeChecker.getSymbolAtLocation(node);
		const declaration = symbol && (symbol.valueDeclaration ?? DArray.first(symbol.declarations));

		if (node.text === "undefined") {
			if (!symbol || declaration) {
				return context.notSupport();
			}

			const packageName = context.registerSharedDependency(undefinedShardDependency.value);

			return context.success({
				result: GoAST.createStructLiteral({
					typeReference: GoAST.createPackageTypeReference({
						packageName,
						identifier: jsUndefinedIdentifier,
					}),
					elements: [],
				}),
			});
		}

		if (!declaration || !isStandardLibraryPath(declaration.path)) {
			return context.notSupport();
		}

		const packageName = context.registerSharedDependency(numberSharedDependency.value);

		return context.success({
			result: GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: packageName,
					identifier: node.text === "NaN" ? jsNaNFunctionIdentifier : jsInfinityFunctionIdentifier,
				}),
				arguments: [],
			}),
		});
	},
);

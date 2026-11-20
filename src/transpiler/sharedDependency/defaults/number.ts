import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const jsNaNFunctionIdentifier = GoAST.createIdentifier("JSNaN");
export const jsInfinityFunctionIdentifier = GoAST.createIdentifier("JSInfinity");
export const jsNegativeZeroFunctionIdentifier = GoAST.createIdentifier("JSNegativeZero");

const mathIdentifier = GoAST.createIdentifier("math");

function mathFunction(identifier: GoAST.Identifier, call: GoAST.Expression) {
	return GoAST.createFunctionDeclaration({
		identifier,
		generic: [],
		arguments: [],
		returnTypes: [GoAST.builtinTypeReferences.float64],
		body: GoAST.createBlockStatement({
			statements: [GoAST.createReturnStatement({ values: [call] })],
		}),
	});
}

// Globaux numériques de JS (D17) et -0 : les constantes Go n'ont pas de zéro
// négatif (`float64(-0)` vaut +0), d'où math.Copysign(0, -1). : NaN et Infinity n'ont pas de constante Go
// (math.NaN() et math.Inf(1) sont des fonctions). Fonctions triviales, inlinées par Go.
export const numberSharedDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [GoAST.createImportDeclaration({ path: "math" })],
		init: [],
		declarations: [
			mathFunction(
				jsNaNFunctionIdentifier,
				GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: mathIdentifier,
						identifier: GoAST.createIdentifier("NaN"),
					}),
					arguments: [],
				}),
			),
			mathFunction(
				jsInfinityFunctionIdentifier,
				GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: mathIdentifier,
						identifier: GoAST.createIdentifier("Inf"),
					}),
					arguments: [GoAST.createIntegerLiteral({ value: 1n })],
				}),
			),
			mathFunction(
				jsNegativeZeroFunctionIdentifier,
				GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: mathIdentifier,
						identifier: GoAST.createIdentifier("Copysign"),
					}),
					arguments: [
						GoAST.createIntegerLiteral({ value: 0n }),
						GoAST.createIntegerLiteral({ value: -1n }),
					],
				}),
			),
		],
	}),
);

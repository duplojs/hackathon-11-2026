import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const numberToStringFunctionIdentifier = GoAST.createIdentifier("NumberToString");

/**
 * ```go
 * func NumberToString(value float64) string {
 *     return strconv.FormatFloat(value, 'f', -1, 64)
 * }
 * ```
 * Reproduit `${value}` de JS pour un nombre : `'f'` sans exposant, `-1` = le moins
 * de chiffres possible qui relit exactement le même float64 (comme JS : 3 → "3", 0.1 → "0.1").
 * Écarts connus avec JS : |x| ≥ 1e21 ou < 1e-6 (JS passe en notation exponentielle),
 * `Infinity` (Go écrit `+Inf`).
 */
export const numberToStringDependency = DCommon.memo(() => {
	const value = GoAST.createIdentifier("value");

	return createSharedDependency({
		imports: [GoAST.createImportDeclaration({ path: "strconv" })],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: numberToStringFunctionIdentifier,
				generic: [],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: value,
						type: GoAST.builtinTypeReferences.float64,
					}),
				],
				returnTypes: [GoAST.builtinTypeReferences.string],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createCallExpression({
									callee: GoAST.createSelectorExpression({
										target: GoAST.createIdentifier("strconv"),
										identifier: GoAST.createIdentifier("FormatFloat"),
									}),
									arguments: [
										value,
										GoAST.createRuneLiteral({ value: "f" }),
										GoAST.createUnaryExpression({
											operator: "-",
											operand: GoAST.createIntegerLiteral({ value: 1n }),
										}),
										GoAST.createIntegerLiteral({ value: 64n }),
									],
								}),
							],
						}),
					],
				}),
			}),
		],
	});
});

import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const printFunctionIdentifier = GoAST.createIdentifier("Print");

/**
 * ```go
 * func Print[T any](value T) T {
 *     switch typed := any(value).(type) {
 *     case string:
 *         fmt.Println(typed)
 *     default:
 *         encoder := json.NewEncoder(os.Stdout)
 *         encoder.SetEscapeHTML(false)
 *         encoder.SetIndent("", "  ")
 *         encoder.Encode(typed)
 *     }
 *     return value
 * }
 * ```
 * Comme `DCommon.print`, la valeur est affichée puis retournée.
 * Une chaîne seule est affichée brute, comme `console.info("texte")`.
 * Le reste est rendu en JSON (tags `json` des variantes Either), et non `util.inspect` de Node.
 */
export const printDependency = DCommon.memo(() => {
	const generic = GoAST.createIdentifier("T");
	const value = GoAST.createIdentifier("value");
	const encoder = GoAST.createIdentifier("encoder");
	const typed = GoAST.createIdentifier("typed");

	const callMethod = (
		target: GoAST.Identifier,
		method: string,
		argumentsList: readonly GoAST.Expression[],
	) => GoAST.createCallExpression({
		callee: GoAST.createSelectorExpression({
			target,
			identifier: GoAST.createIdentifier(method),
		}),
		arguments: argumentsList,
	});

	const printString = callMethod(GoAST.createIdentifier("fmt"), "Println", [typed]);

	const printJson = [
		GoAST.createShortVariableDeclarationStatement({
			identifier: encoder,
			initializer: callMethod(GoAST.createIdentifier("json"), "NewEncoder", [
				GoAST.createSelectorExpression({
					target: GoAST.createIdentifier("os"),
					identifier: GoAST.createIdentifier("Stdout"),
				}),
			]),
		}),
		callMethod(encoder, "SetEscapeHTML", [GoAST.createBooleanLiteral({ value: false })]),
		callMethod(encoder, "SetIndent", [
			GoAST.createStringLiteral({ value: "" }),
			GoAST.createStringLiteral({ value: "  " }),
		]),
		callMethod(encoder, "Encode", [typed]),
	];

	return createSharedDependency({
		imports: [
			GoAST.createImportDeclaration({ path: "encoding/json" }),
			GoAST.createImportDeclaration({ path: "fmt" }),
			GoAST.createImportDeclaration({ path: "os" }),
		],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: printFunctionIdentifier,
				generic: [
					GoAST.createTypeParameter({
						identifier: generic,
						constraint: GoAST.builtinTypeReferences.any,
					}),
				],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: value,
						type: generic,
					}),
				],
				returnTypes: [generic],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createTypeSwitchStatementWithDefault({
							identifier: typed,
							expression: GoAST.createConversionExpression({
								typeReference: GoAST.builtinTypeReferences.any,
								operand: value,
							}),
							casesBeforeDefault: [
								GoAST.createTypeSwitchCase({
									types: DCommon.cast([GoAST.builtinTypeReferences.string]),
									statements: [printString],
								}),
							],
							defaultCase: GoAST.createDefaultCase({ statements: printJson }),
							casesAfterDefault: [],
						}),
						GoAST.createReturnStatement({ values: [value] }),
					],
				}),
			}),
		],
	});
});

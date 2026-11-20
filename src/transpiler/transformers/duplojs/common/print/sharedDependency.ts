import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

// Runtime Go reproduisant `console.info` / `util.inspect` de Node pour les valeurs prises en
// charge. Chaque type est affiché par une fonction dédiée choisie à la compilation selon
// son type statique : aucun recours à la réflexion à l'exécution.

export const printFunctionIdentifier = GoAST.createIdentifier("Print");
export const inspectNumberIdentifier = GoAST.createIdentifier("InspectNumber");
export const inspectStringIdentifier = GoAST.createIdentifier("InspectString");
export const inspectRawStringIdentifier = GoAST.createIdentifier("InspectRawString");
export const inspectNullIdentifier = GoAST.createIdentifier("InspectNull");
export const inspectUndefinedIdentifier = GoAST.createIdentifier("InspectUndefined");
export const inspectEntriesIdentifier = GoAST.createIdentifier("InspectEntries");
export const numberToStringIdentifier = GoAST.createIdentifier("NumberToString");

const inspectLengthIdentifier = GoAST.createIdentifier("inspectLength");

// Constructions locales au runtime : elles gardent lisible le code Go décrit ci-dessous.
const identifier = (value: string) => GoAST.createIdentifier(value);
const stringLiteral = (value: string) => GoAST.createStringLiteral({ value });
const integerLiteral = (value: number) => GoAST.createIntegerLiteral({ value: BigInt(value) });
const negative = (operand: GoAST.Expression) => GoAST.createUnaryExpression({
	operator: "-",
	operand,
});
const binary = (
	left: GoAST.Expression,
	operator: GoAST.BinaryOperator,
	right: GoAST.Expression,
) => GoAST.createBinaryExpression({
	operator,
	left,
	right,
});
const concatenate = (...parts: readonly GoAST.Expression[]) => DCommon.pipe(
	parts,
	DArray.reduce(
		DArray.reduceFrom<GoAST.Expression | undefined>(undefined),
		({ element, lastValue, next }) => next(lastValue ? binary(lastValue, "+", element) : element),
	),
	(expression) => expression ?? stringLiteral(""),
);
const call = (
	callee: GoAST.Expression,
	...callArguments: readonly GoAST.Expression[]
) => GoAST.createCallExpression({
	callee,
	arguments: callArguments,
});
const member = (target: GoAST.Expression, name: string) => GoAST.createSelectorExpression({
	target,
	identifier: identifier(name),
});
const block = (...statements: readonly GoAST.Statement[]) => GoAST.createBlockStatement({ statements });
const returnValue = (value: GoAST.Expression) => GoAST.createReturnStatement({ values: [value] });
const ifThen = (
	condition: GoAST.Expression,
	...statements: readonly GoAST.Statement[]
) => GoAST.createIfStatement({
	condition,
	body: block(...statements),
});
const assign = (target: GoAST.Identifier, value: GoAST.Expression) => GoAST.createAssignmentStatement({
	targets: DCommon.cast([target]),
	values: DCommon.cast([value]),
});
const declare = (target: GoAST.Identifier, value: GoAST.Expression) => GoAST.createShortVariableDeclarationStatement({
	identifier: target,
	initializer: value,
});
const argument = (name: string | GoAST.Identifier, type: GoAST.FunctionArgumentType) => GoAST.createFunctionArgument({
	identifier: typeof name === "string" ? identifier(name) : name,
	type,
});
const length = (value: GoAST.Expression) => call(identifier("len"), value);

const mathPackage = identifier("math");
const osPackage = identifier("os");
const strconvPackage = identifier("strconv");
const stringsPackage = identifier("strings");

const { float64, string, int } = GoAST.builtinTypeReferences;

export const inspectorType = (valueType: GoAST.FunctionArgumentType) => GoAST.createFunctionType({
	arguments: [
		argument("_", valueType),
		argument("_", int),
	],
	returnTypes: [string],
});

// Algorithme Number::toString d'ECMAScript à partir des chiffres les plus courts produits par Go.
function createNumberToString() {
	const value = identifier("value");
	const sign = identifier("sign");
	const scientific = identifier("scientific");
	const exponentIndex = identifier("exponentIndex");
	const digits = identifier("digits");
	const exponent = identifier("exponent");
	const point = identifier("point");
	const mantissa = identifier("mantissa");
	const exponentSign = identifier("exponentSign");

	return GoAST.createFunctionDeclaration({
		identifier: numberToStringIdentifier,
		generic: [],
		arguments: [argument(value, float64)],
		returnTypes: [string],
		body: block(
			ifThen(binary(value, "!=", value), returnValue(stringLiteral("NaN"))),
			ifThen(binary(value, "==", integerLiteral(0)), returnValue(stringLiteral("0"))),
			ifThen(
				call(member(mathPackage, "IsInf"), value, integerLiteral(1)),
				returnValue(stringLiteral("Infinity")),
			),
			ifThen(
				call(member(mathPackage, "IsInf"), value, negative(integerLiteral(1))),
				returnValue(stringLiteral("-Infinity")),
			),
			declare(sign, stringLiteral("")),
			ifThen(
				binary(value, "<", integerLiteral(0)),
				assign(sign, stringLiteral("-")),
				assign(value, negative(value)),
			),
			declare(
				scientific,
				call(
					member(strconvPackage, "FormatFloat"),
					value,
					GoAST.createRuneLiteral({ value: "e" }),
					negative(integerLiteral(1)),
					integerLiteral(64),
				),
			),
			declare(
				exponentIndex,
				call(member(stringsPackage, "IndexByte"), scientific, GoAST.createRuneLiteral({ value: "e" })),
			),
			declare(
				digits,
				call(
					member(stringsPackage, "Replace"),
					GoAST.createSliceExpression({
						target: scientific,
						high: exponentIndex,
					}),
					stringLiteral("."),
					stringLiteral(""),
					integerLiteral(1),
				),
			),
			GoAST.createVariableDeclarationZeroValue({
				identifier: exponent,
				typeReference: int,
			}),
			GoAST.createAssignmentStatement({
				targets: DCommon.cast([exponent, identifier("_")]),
				values: DCommon.cast([
					call(
						member(strconvPackage, "Atoi"),
						GoAST.createSliceExpression({
							target: scientific,
							low: binary(exponentIndex, "+", integerLiteral(1)),
						}),
					),
				]),
			}),
			declare(point, binary(exponent, "+", integerLiteral(1))),
			ifThen(
				binary(
					binary(length(digits), "<=", point),
					"&&",
					binary(point, "<=", integerLiteral(21)),
				),
				returnValue(
					concatenate(
						sign,
						digits,
						call(member(stringsPackage, "Repeat"), stringLiteral("0"), binary(point, "-", length(digits))),
					),
				),
			),
			ifThen(
				binary(
					binary(integerLiteral(0), "<", point),
					"&&",
					binary(point, "<=", integerLiteral(21)),
				),
				returnValue(
					concatenate(
						sign,
						GoAST.createSliceExpression({
							target: digits,
							high: point,
						}),
						stringLiteral("."),
						GoAST.createSliceExpression({
							target: digits,
							low: point,
						}),
					),
				),
			),
			ifThen(
				binary(
					binary(negative(integerLiteral(6)), "<", point),
					"&&",
					binary(point, "<=", integerLiteral(0)),
				),
				returnValue(
					concatenate(
						sign,
						stringLiteral("0."),
						call(member(stringsPackage, "Repeat"), stringLiteral("0"), negative(point)),
						digits,
					),
				),
			),
			declare(
				mantissa,
				GoAST.createSliceExpression({
					target: digits,
					high: integerLiteral(1),
				}),
			),
			ifThen(
				binary(length(digits), ">", integerLiteral(1)),
				assign(
					mantissa,
					concatenate(
						mantissa,
						stringLiteral("."),
						GoAST.createSliceExpression({
							target: digits,
							low: integerLiteral(1),
						}),
					),
				),
			),
			declare(exponentSign, stringLiteral("+")),
			ifThen(
				binary(exponent, "<", integerLiteral(0)),
				assign(exponentSign, stringLiteral("-")),
				assign(exponent, negative(exponent)),
			),
			returnValue(
				concatenate(
					sign,
					mantissa,
					stringLiteral("e"),
					exponentSign,
					call(member(strconvPackage, "Itoa"), exponent),
				),
			),
		),
	});
}

// `util.inspect` affiche `-0` alors que la conversion en chaîne donne `0`.
function createInspectNumber() {
	const value = identifier("value");

	return GoAST.createFunctionDeclaration({
		identifier: inspectNumberIdentifier,
		generic: [],
		arguments: [argument(value, float64), argument("_", int)],
		returnTypes: [string],
		body: block(
			ifThen(
				binary(
					binary(value, "==", integerLiteral(0)),
					"&&",
					call(member(mathPackage, "Signbit"), value),
				),
				returnValue(stringLiteral("-0")),
			),
			returnValue(call(numberToStringIdentifier, value)),
		),
	});
}

function createConstantInspector(
	functionIdentifier: GoAST.Identifier,
	valueType: GoAST.FunctionArgumentType,
	text: string,
) {
	return GoAST.createFunctionDeclaration({
		identifier: functionIdentifier,
		generic: [],
		arguments: [argument("_", valueType), argument("_", int)],
		returnTypes: [string],
		body: block(returnValue(stringLiteral(text))),
	});
}

// Guillemets et échappements de `strEscape` (Node) pour une chaîne affichée dans une structure.
function createInspectString() {
	const value = identifier("value");
	const quote = identifier("quote");
	const builder = identifier("builder");
	const character = identifier("character");
	const write = (text: GoAST.Expression) => call(member(builder, "WriteString"), text);
	const contains = (text: string) => call(member(stringsPackage, "Contains"), value, stringLiteral(text));
	const isCharacter = (text: string) => binary(character, "==", GoAST.createRuneLiteral({ value: text }));
	const escapes: readonly (readonly [string, string])[] = [
		["\\", "\\\\"],
		["\n", "\\n"],
		["\t", "\\t"],
		["\r", "\\r"],
		["\b", "\\b"],
		["\f", "\\f"],
	];

	const hexadecimalEscape = block(
		write(stringLiteral("\\x")),
		write(
			call(
				member(stringsPackage, "ToUpper"),
				GoAST.createSliceExpression({
					target: call(
						member(strconvPackage, "FormatInt"),
						binary(
							GoAST.createConversionExpression({
								typeReference: GoAST.builtinTypeReferences.int64,
								operand: character,
							}),
							"+",
							integerLiteral(0x100),
						),
						integerLiteral(16),
					),
					low: integerLiteral(1),
				}),
			),
		),
	);

	const characterBranch = DCommon.pipe(
		escapes,
		DArray.reduceRight(
			DArray.reduceFrom<GoAST.IfStatement | GoAST.BlockStatement>(
				GoAST.createIfStatement({
					condition: binary(
						binary(character, "<", integerLiteral(0x20)),
						"||",
						binary(
							binary(character, ">=", integerLiteral(0x7f)),
							"&&",
							binary(character, "<=", integerLiteral(0x9f)),
						),
					),
					body: hexadecimalEscape,
					elseBranch: block(call(member(builder, "WriteRune"), character)),
				}),
			),
			({ element: [source, escaped], lastValue, next }) => next(
				GoAST.createIfStatement({
					condition: isCharacter(source),
					body: block(write(stringLiteral(escaped))),
					elseBranch: lastValue,
				}),
			),
		),
		(elseBranch) => GoAST.createIfStatement({
			condition: binary(isCharacter("'"), "&&", binary(quote, "==", stringLiteral("'"))),
			body: block(write(stringLiteral("\\'"))),
			elseBranch,
		}),
	);

	return GoAST.createFunctionDeclaration({
		identifier: inspectStringIdentifier,
		generic: [],
		arguments: [argument(value, string), argument("_", int)],
		returnTypes: [string],
		body: block(
			declare(quote, stringLiteral("'")),
			ifThen(
				contains("'"),
				GoAST.createIfStatement({
					condition: GoAST.createUnaryExpression({
						operator: "!",
						operand: contains("\""),
					}),
					body: block(assign(quote, stringLiteral("\""))),
					elseBranch: ifThen(
						binary(
							GoAST.createUnaryExpression({
								operator: "!",
								operand: contains("`"),
							}),
							"&&",
							GoAST.createUnaryExpression({
								operator: "!",
								operand: contains("${"),
							}),
						),
						assign(quote, stringLiteral("`")),
					),
				}),
			),
			GoAST.createVariableDeclarationZeroValue({
				identifier: builder,
				typeReference: GoAST.createPackageTypeReference({
					packageName: stringsPackage,
					identifier: identifier("Builder"),
				}),
			}),
			write(quote),
			GoAST.createRangeStatement({
				binding: GoAST.createRangeDeclaration({
					key: identifier("_"),
					value: character,
				}),
				expression: value,
				body: block(characterBranch),
			}),
			write(quote),
			returnValue(call(member(builder, "String"))),
		),
	});
}

function createInspectRawString() {
	const value = identifier("value");

	return GoAST.createFunctionDeclaration({
		identifier: inspectRawStringIdentifier,
		generic: [],
		arguments: [argument(value, string), argument("_", int)],
		returnTypes: [string],
		body: block(returnValue(value)),
	});
}

// Longueur en unités UTF-16, comme `String.prototype.length` utilisé par Node.
function createInspectLength() {
	const value = identifier("value");
	const lengthIdentifier = identifier("length");
	const character = identifier("character");

	return GoAST.createFunctionDeclaration({
		identifier: inspectLengthIdentifier,
		generic: [],
		arguments: [argument(value, string)],
		returnTypes: [int],
		body: block(
			declare(lengthIdentifier, integerLiteral(0)),
			GoAST.createRangeStatement({
				binding: GoAST.createRangeDeclaration({
					key: identifier("_"),
					value: character,
				}),
				expression: value,
				body: block(
					assign(lengthIdentifier, binary(lengthIdentifier, "+", integerLiteral(1))),
					ifThen(
						binary(character, ">", integerLiteral(0xFFFF)),
						assign(lengthIdentifier, binary(lengthIdentifier, "+", integerLiteral(1))),
					),
				),
			}),
			returnValue(lengthIdentifier),
		),
	});
}

// `reduceToSingleString` de Node (mode compact 3, largeur 80) : une ligne si les entrées
// tiennent, sinon une entrée par ligne indentée.
function createInspectEntries() {
	const entries = identifier("entries");
	const indentation = identifier("indentation");
	const opening = identifier("opening");
	const closing = identifier("closing");
	const totalLength = identifier("totalLength");
	const isBelowBreakLength = identifier("isBelowBreakLength");
	const entry = identifier("entry");
	const newLine = identifier("newLine");
	const join = (separator: GoAST.Expression) => call(member(stringsPackage, "Join"), entries, separator);

	return GoAST.createFunctionDeclaration({
		identifier: inspectEntriesIdentifier,
		generic: [],
		arguments: [
			argument(entries, GoAST.createSliceType({ elementType: string })),
			argument(indentation, int),
			argument(opening, string),
			argument(closing, string),
		],
		returnTypes: [string],
		body: block(
			ifThen(
				binary(length(entries), "==", integerLiteral(0)),
				returnValue(concatenate(opening, closing)),
			),
			declare(
				totalLength,
				concatenate(length(entries), length(entries), indentation, length(opening), integerLiteral(10)),
			),
			declare(
				isBelowBreakLength,
				binary(binary(totalLength, "+", length(entries)), "<=", integerLiteral(80)),
			),
			GoAST.createRangeStatement({
				binding: GoAST.createRangeDeclaration({
					key: identifier("_"),
					value: entry,
				}),
				expression: entries,
				body: block(
					assign(totalLength, binary(totalLength, "+", call(inspectLengthIdentifier, entry))),
					ifThen(
						binary(
							binary(totalLength, ">", integerLiteral(80)),
							"||",
							call(member(stringsPackage, "Contains"), entry, stringLiteral("\n")),
						),
						assign(isBelowBreakLength, GoAST.createBooleanLiteral({ value: false })),
					),
				),
			}),
			ifThen(
				isBelowBreakLength,
				returnValue(
					concatenate(opening, stringLiteral(" "), join(stringLiteral(", ")), stringLiteral(" "), closing),
				),
			),
			declare(
				newLine,
				concatenate(stringLiteral("\n"), call(member(stringsPackage, "Repeat"), stringLiteral(" "), indentation)),
			),
			returnValue(
				concatenate(
					opening,
					newLine,
					stringLiteral("  "),
					join(concatenate(stringLiteral(","), newLine, stringLiteral("  "))),
					newLine,
					closing,
				),
			),
		),
	});
}

function createPrint() {
	const generic = identifier("T");
	const value = identifier("value");
	const inspect = identifier("inspect");

	return GoAST.createFunctionDeclaration({
		identifier: printFunctionIdentifier,
		generic: [
			GoAST.createTypeParameter({
				identifier: generic,
				constraint: GoAST.builtinTypeReferences.any,
			}),
		],
		arguments: [argument(value, generic), argument(inspect, inspectorType(generic))],
		returnTypes: [generic],
		body: block(
			call(
				member(member(osPackage, "Stdout"), "WriteString"),
				concatenate(call(inspect, value, integerLiteral(0)), stringLiteral("\n")),
			),
			returnValue(value),
		),
	});
}

export const inspectDependency = DCommon.memo(() => createSharedDependency({
	imports: [
		GoAST.createImportDeclaration({ path: "math" }),
		GoAST.createImportDeclaration({ path: "os" }),
		GoAST.createImportDeclaration({ path: "strconv" }),
		GoAST.createImportDeclaration({ path: "strings" }),
	],
	init: [],
	declarations: [
		createNumberToString(),
		createInspectNumber(),
		createConstantInspector(inspectNullIdentifier, identifier("JSNull"), "null"),
		createConstantInspector(inspectUndefinedIdentifier, identifier("JSUndefined"), "undefined"),
		createInspectString(),
		createInspectRawString(),
		createInspectLength(),
		createInspectEntries(),
		createPrint(),
	],
}));

// Expose les constructions locales aux inspecteurs des types (Either, unions…).
export const inspectorBuilders = {
	identifier,
	stringLiteral,
	integerLiteral,
	binary,
	concatenate,
	call,
	member,
	block,
	returnValue,
	ifThen,
	argument,
};

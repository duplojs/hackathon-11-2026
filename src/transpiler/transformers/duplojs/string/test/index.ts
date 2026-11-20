import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DString from "@duplojs/lang/string";
import { type BuildContext } from "../../../../context/build";
import { evaluateToVariable } from "../../../expression/evaluate";

const regexpImport = DCommon.memo(() => GoAST.createImportDeclaration({ path: "regexp" }));

// Constructions JavaScript absentes du moteur Go (RE2) : assertions avant/arrière et références arrière.
const unsupportedPatterns = /\(\?<?[=!]|\\[1-9]|\\k</;

// Drapeaux traduits par un préfixe Go ; `g` et `y` rendent `test` dépendant de `lastIndex`.
const flagPrefixes: ReadonlyMap<string, string> = new Map([
	["i", "(?i)"],
	["m", "(?m)"],
	["s", "(?s)"],
	["u", ""],
]);

// `DString.test(string, /motif/)` : l'expression régulière est compilée une seule fois, dans une
// variable du paquet (`regexp.MustCompile`), puis testée avec `MatchString`.
export async function testExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node) || !DArray.lengthEqual(node.arguments, 2)) {
		return context.error(node, "string-test-expects-string-and-regexp");
	}

	const [stringNode, regExpNode] = node.arguments;

	if (!stringNode || !regExpNode || !TsAST.isRegularExpressionLiteral(regExpNode)) {
		return context.error(node, "string-test-expects-regexp-literal");
	}

	// Littéral `/motif/drapeaux` : le motif est entre le premier et le dernier `/`.
	const literal = regExpNode.text;
	const closingSlash = DString.lastIndexOf(literal, "/") ?? 0;
	const pattern = DString.slice(literal, 1, closingSlash);
	const flags = DString.slice(literal, closingSlash + 1, DString.length(literal));

	if (DString.test(pattern, unsupportedPatterns)) {
		return context.error(regExpNode, "regexp-construct-not-supported-by-go");
	}

	const prefix = DArray.reduce(
		// `split` d'une chaîne vide donne `[""]` : sans drapeau, il n'y a rien à lire.
		DArray.filter(DString.split(flags, ""), (flag) => flag !== ""),
		DArray.reduceFrom(""),
		({ element, lastValue, next, exit }) => {
			const flagPrefix = flagPrefixes.get(element);

			return flagPrefix === undefined
				? exit(context.error(regExpNode, "regexp-flag-not-supported"))
				: next(`${lastValue}${flagPrefix}`);
		},
	);

	if (DEither.isLeft(prefix)) {
		return prefix;
	}

	const string = await evaluateToVariable(stringNode, context);

	if (DEither.isLeft(string)) {
		return string;
	}

	const compiled = context.generateIdentifier("compiledPattern");

	context.file.imports.add(regexpImport.value);
	context.file.declarations.add(
		GoAST.createVariableDeclarationInitialized({
			identifier: compiled,
			initializer: GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: GoAST.createIdentifier("regexp"),
					identifier: GoAST.createIdentifier("MustCompile"),
				}),
				arguments: [GoAST.createStringLiteral({ value: `${prefix}${pattern}` })],
			}),
		}),
	);

	return context.success({
		before: DEither.unwrapRight(string).before,
		result: GoAST.createCallExpression({
			callee: GoAST.createSelectorExpression({
				target: compiled,
				identifier: GoAST.createIdentifier("MatchString"),
			}),
			arguments: [DEither.unwrapRight(string).identifier],
		}),
	});
}

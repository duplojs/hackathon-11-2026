import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";

function parseRegex(regexNode: TsAST.Node): string {
	let rawPattern = "";
	let flags = "";
	if (TsAST.isRegularExpressionLiteral(regexNode)) {
		const text = regexNode.text;
		const lastSlash = text.lastIndexOf("/");
		if (lastSlash > 0) {
			rawPattern = text.slice(1, lastSlash);
			flags = text.slice(lastSlash + 1);
		} else {
			rawPattern = text;
		}
	} else if (TsAST.isStringLiteral(regexNode)) {
		rawPattern = regexNode.text;
	}

	let prefix = "";
	if (flags.includes("i")) prefix += "i";
	if (flags.includes("m")) prefix += "m";
	if (flags.includes("s")) prefix += "s";

	return (prefix ? `(?${prefix})` : "") + rawPattern;
}

export async function testExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (!TsAST.isCallExpression(node)) {
		return context.notSupport();
	}

	context.file.imports.add(
		GoAST.createImportDeclaration({ path: "regexp" }),
	);

	// 2 arguments : test(string, regExp)
	if (node.arguments.length === 2) {
		const [strArg, regexArg] = node.arguments;
		if (!strArg || !regexArg) {
			return context.error(node, "test-missing-arguments");
		}

		const goPattern = parseRegex(regexArg);
		const reIdent = context.generateIdentifier();
		context.file.declarations.add(
			GoAST.createVariableDeclarationInitialized({
				identifier: reIdent,
				initializer: GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: GoAST.createIdentifier("regexp"),
						identifier: GoAST.createIdentifier("MustCompile"),
					}),
					arguments: [GoAST.createStringLiteral({ value: goPattern })],
				}),
			}),
		);

		const transformedStr = await DCommon.asyncPipe(
			context.transform(strArg, expressionTransformers.value),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(transformedStr)) {
			return transformedStr;
		}

		return context.success({
			before: transformedStr.before ?? [],
			result: GoAST.createCallExpression({
				callee: GoAST.createSelectorExpression({
					target: reIdent,
					identifier: GoAST.createIdentifier("MatchString"),
				}),
				arguments: [transformedStr.result],
			}),
		});
	}

	// 1 argument : test(regExp) currié
	if (node.arguments.length === 1) {
		const [regexArg] = node.arguments;
		if (!regexArg) {
			return context.error(node, "test-missing-arguments");
		}

		const goPattern = parseRegex(regexArg);
		const reIdent = context.generateIdentifier();
		context.file.declarations.add(
			GoAST.createVariableDeclarationInitialized({
				identifier: reIdent,
				initializer: GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: GoAST.createIdentifier("regexp"),
						identifier: GoAST.createIdentifier("MustCompile"),
					}),
					arguments: [GoAST.createStringLiteral({ value: goPattern })],
				}),
			}),
		);

		const sIdent = context.generateIdentifier();
		return context.success({
			result: GoAST.createFunctionLiteral({
				arguments: [
					GoAST.createFunctionArgument({
						identifier: sIdent,
						type: GoAST.builtinTypeReferences.string,
					}),
				],
				returnTypes: [GoAST.builtinTypeReferences.bool],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createCallExpression({
									callee: GoAST.createSelectorExpression({
										target: reIdent,
										identifier: GoAST.createIdentifier("MatchString"),
									}),
									arguments: [sIdent],
								}),
							],
						}),
					],
				}),
			}),
		});
	}

	return context.error(node, "test-invalid-arguments");
}

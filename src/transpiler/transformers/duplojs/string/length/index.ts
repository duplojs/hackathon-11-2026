import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";

export async function lengthExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	context.file.imports.add(
		GoAST.createImportDeclaration({ path: "unicode/utf8" }),
	);

	if (TsAST.isCallExpression(node)) {
		const arg = DArray.first(node.arguments);
		if (!arg) {
			return context.error(node, "string-length-requires-argument");
		}
		const transformed = await DCommon.asyncPipe(
			context.transform(arg, expressionTransformers.value),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(transformed)) {
			return transformed;
		}

		return context.success({
			before: transformed.before ?? [],
			result: GoAST.createCallExpression({
				callee: GoAST.builtinTypeReferences.float64,
				arguments: [
					GoAST.createCallExpression({
						callee: GoAST.createSelectorExpression({
							target: GoAST.createIdentifier("utf8"),
							identifier: GoAST.createIdentifier("RuneCountInString"),
						}),
						arguments: [transformed.result],
					}),
				],
			}),
		});
	}

	return context.notSupport();
}

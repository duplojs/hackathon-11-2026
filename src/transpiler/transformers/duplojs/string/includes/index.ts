import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";

export async function includesExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (!TsAST.isCallExpression(node) || node.arguments.length < 2) {
		return context.notSupport();
	}

	context.file.imports.add(
		GoAST.createImportDeclaration({ path: "strings" }),
	);

	const [strArg, subArg] = node.arguments;
	if (!strArg || !subArg) {
		return context.error(node, "includes-missing-arguments");
	}

	const transformedStr = await DCommon.asyncPipe(
		context.transform(strArg, expressionTransformers.value),
		DEither.unwrapRight,
	);
	if (DEither.isLeft(transformedStr)) {
		return transformedStr;
	}

	const transformedSub = await DCommon.asyncPipe(
		context.transform(subArg, expressionTransformers.value),
		DEither.unwrapRight,
	);
	if (DEither.isLeft(transformedSub)) {
		return transformedSub;
	}

	return context.success({
		before: [
			...(transformedStr.before ?? []),
			...(transformedSub.before ?? []),
		],
		result: GoAST.createCallExpression({
			callee: GoAST.createSelectorExpression({
				target: GoAST.createIdentifier("strings"),
				identifier: GoAST.createIdentifier("Contains"),
			}),
			arguments: [transformedStr.result, transformedSub.result],
		}),
	});
}

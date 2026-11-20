import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";

// DEither.isRight(e) / DEither.isLeft(e) → e.IsRight() / e.IsLeft() : une
// méthode du contrat porté par la représentation Go de Either (ADR-1 §7,
// Personne 4), que le compilateur Go inline. Ce handler ne connaît ni ne
// doit connaître la représentation concrète (struct à discriminant, union
// fermée...) : il délègue entièrement ce choix à la méthode.
const isRightMethodIdentifier = GoAST.createIdentifier("IsRight");
const isLeftMethodIdentifier = GoAST.createIdentifier("IsLeft");

async function booleanMethodCallHandler(
	node: TsAST.Node,
	context: BuildContext,
	methodIdentifier: GoAST.Identifier,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.notSupport();
	}

	if (!DArray.lengthEqual(node.arguments, 1)) {
		return context.error(node, "duplojs-either-isright-isleft-single-argument-only");
	}

	const argumentNode = DArray.first(node.arguments);

	if (!argumentNode) {
		return context.error(node, "missing-isright-isleft-argument");
	}

	const argument = await DCommon.asyncPipe(
		context.transform(argumentNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	return context.success({
		before: argument.before,
		result: GoAST.createCallExpression({
			callee: GoAST.createSelectorExpression({
				target: argument.result,
				identifier: methodIdentifier,
			}),
			arguments: [],
		}),
	});
}

export async function isRightExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	return booleanMethodCallHandler(node, context, isRightMethodIdentifier);
}

export async function isLeftExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	return booleanMethodCallHandler(node, context, isLeftMethodIdentifier);
}

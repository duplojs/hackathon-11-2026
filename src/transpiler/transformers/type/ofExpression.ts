import { type TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../context/build";
import { SignatureKind } from "typescript/async";
import { typeTransformers } from ".";

/** Type Go d'une expression, d'après le checker (pour déclarer `var r T`). */
export async function transformTypeOfExpression(
	expression: TsAST.Expression,
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;
	const type = await typeChecker.getTypeAtLocation(expression);
	const typeNode = await typeChecker.typeToTypeNode(type, expression);

	if (!typeNode) {
		return context.error(expression, "expression-type-unknown");
	}

	return DCommon.asyncPipe(
		context.transform(typeNode, typeTransformers.value),
		DEither.unwrapRight,
	);
}

/** Type Go de ce que renvoie une fonction, d'après le checker. */
export async function transformReturnTypeOfFunction(
	expression: TsAST.Expression,
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;
	const signatures = await typeChecker.getSignaturesOfType(
		await typeChecker.getTypeAtLocation(expression),
		SignatureKind.Call,
	);
	const [signature] = signatures;

	if (!signature || signatures.length !== 1) {
		return context.error(expression, "function-return-type-unknown");
	}

	const typeNode = await typeChecker.typeToTypeNode(
		await typeChecker.getReturnTypeOfSignature(signature),
		expression,
	);

	if (!typeNode) {
		return context.error(expression, "function-return-type-unknown");
	}

	return DCommon.asyncPipe(
		context.transform(typeNode, typeTransformers.value),
		DEither.unwrapRight,
	);
}

import { TsAST } from "@typescript";
import { GoAST } from "@go";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { SignatureKind } from "typescript/async";
import { type BuildContext } from "../../context/build";
import { expressionTransformers } from "../expression";
import { createSimpleAssignment } from "./assignment";

/**
 * `(x) => corps` recopiée en ligne : `x := argument`, puis le corps.
 * `_ = x` car Go refuse une variable jamais lue.
 */
async function inlineArrowFunction(
	callback: TsAST.ArrowFunction,
	argument: GoAST.Expression,
	context: BuildContext,
) {
	if (TsAST.isBlock(callback.body) || callback.parameters.length > 1) {
		// Seulement `() => valeur` et `(x) => valeur`.
		return context.error(callback, "callback-not-supported-yet");
	}

	const [parameter] = callback.parameters;

	if (
		parameter
		&& (!TsAST.isIdentifier(parameter.name) || parameter.initializer || parameter.dotDotDotToken)
	) {
		// Déstructuration, valeur par défaut, `...reste` : pas gérés.
		return context.error(parameter, "callback-parameter-not-supported");
	}

	const parameterStatements = parameter && TsAST.isIdentifier(parameter.name)
		? DCommon.pipe(
			context.createSourceIdentifier(parameter.name.text),
			(parameterIdentifier) => [
				GoAST.createShortVariableDeclarationStatement({
					identifier: parameterIdentifier,
					initializer: argument,
				}),
				createSimpleAssignment(GoAST.createIdentifier("_"), parameterIdentifier),
			],
		)
		: [];

	const body = await DCommon.asyncPipe(
		context.transform(callback.body, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(body)) {
		return body;
	}

	return DEither.right("inline-callback", {
		before: DArray.concat(parameterStatements, body.before),
		result: body.result,
	});
}

/** Fonction passée par son nom : un simple appel `f(argument)`. */
async function inlineFunctionReference(
	callback: TsAST.Identifier | TsAST.PropertyAccessExpression,
	argument: GoAST.Expression,
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;
	const signatures = await typeChecker.getSignaturesOfType(
		await typeChecker.getTypeAtLocation(callback),
		SignatureKind.Call,
	);
	const [signature] = signatures;

	if (!signature || signatures.length !== 1 || signature.parameters.length > 1) {
		// Surcharge ou plusieurs paramètres : pas géré.
		return context.error(callback, "callback-function-not-supported");
	}

	const callee = await DCommon.asyncPipe(
		context.transform(callback, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(callee)) {
		return callee;
	}

	return DEither.right("inline-callback", {
		before: callee.before,
		result: GoAST.createCallExpression({
			callee: callee.result,
			// Fonction sans paramètre : on ne lui passe rien.
			arguments: signature.parameters.length === 1 ? [argument] : [],
		}),
	});
}

/**
 * Décision n°5 : une fonction passée en argument est recopiée en ligne,
 * pas changée en closure. Renvoie `{ before, result }`.
 */
export function inlineCallback(
	callback: TsAST.Expression,
	argument: GoAST.Expression,
	context: BuildContext,
) {
	if (TsAST.isArrowFunction(callback)) {
		return inlineArrowFunction(callback, argument, context);
	}

	if (TsAST.isIdentifier(callback) || TsAST.isPropertyAccessExpression(callback)) {
		return inlineFunctionReference(callback, argument, context);
	}

	return context.error(callback, "callback-not-supported-yet");
}

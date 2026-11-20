import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { transformTypeOfExpression } from "../../../type/ofExpression";
import { createSimpleAssignment } from "../../../common";
import { inlineCallback } from "../../../common/inlineCallback";
import { eitherIsRightFieldIdentifier, eitherRightFieldIdentifier } from "../sharedDependency";

/**
 * Cœur de `whenIsRight`, partagé par la forme à 2 arguments et par `pipe`
 * (forme curryfiée). Code en ligne, pas de fonction anonyme (décision n°5) :
 *
 *   Generated_1 := <entrée>
 *   var Generated_2 <type du résultat>
 *   if Generated_1.IsRight {
 *       ...fonction recopiée en ligne (inlineCallback) avec Generated_1.Right
 *       Generated_2 = <résultat de la fonction>    // succès : résultat TEL QUEL
 *   } else {
 *       Generated_2 = Generated_1                  // sinon : entrée inchangée
 *   }
 *   -> résultat : Generated_2
 *
 * Comme le code de DuploJS : `if (isRight(input)) return theFunction(value); return input;`
 */
export async function applyWhenIsRight(
	input: GoAST.Expression,
	callback: TsAST.Expression,
	resultType: GoAST.Type | GoAST.TypeReference,
	context: BuildContext,
	// whenIsRightOtherwise : la fonction du cas d'échec, qui reçoit l'Either entier.
	// Absente (whenIsRight) : l'entrée est renvoyée inchangée.
	otherwiseCallback?: TsAST.Expression,
) {
	const accumulator = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: input,
	});

	const output = GoAST.createVariableDeclarationZeroValue({
		identifier: context.generateIdentifier(),
		typeReference: resultType,
	});

	const inlined = await inlineCallback(
		callback,
		GoAST.createSelectorExpression({
			target: accumulator.identifier,
			identifier: eitherRightFieldIdentifier,
		}),
		context,
	);

	if (DEither.isLeft(inlined)) {
		return inlined;
	}

	const { before, result } = DEither.unwrapRight(inlined);

	// Branche « échec » : l'entrée inchangée (whenIsRight) ou la 2e fonction (whenIsRightOtherwise).
	let elseStatements: GoAST.Statement[] = [createSimpleAssignment(output.identifier, accumulator.identifier)];

	if (otherwiseCallback) {
		const otherwise = await inlineCallback(otherwiseCallback, accumulator.identifier, context);

		if (DEither.isLeft(otherwise)) {
			return otherwise;
		}

		const unwrapped = DEither.unwrapRight(otherwise);

		elseStatements = [...unwrapped.before, createSimpleAssignment(output.identifier, unwrapped.result)];
	}

	return DEither.right("when-is-right", {
		before: [
			accumulator,
			output,
			GoAST.createIfStatement({
				condition: GoAST.createSelectorExpression({
					target: accumulator.identifier,
					identifier: eitherIsRightFieldIdentifier,
				}),
				body: GoAST.createBlockStatement({
					statements: DArray.push(before, createSimpleAssignment(output.identifier, result)),
				}),
				elseBranch: GoAST.createBlockStatement({
					statements: elseStatements,
				}),
			}),
		] as GoAST.Statement[],
		identifier: output.identifier,
	});
}

/** Vrai si `node` est l'appel curryfié `DEither.whenIsRight(fonction)` (un seul argument). */
export function isCurriedWhenIsRight(node: TsAST.Expression, name: string | undefined) {
	return TsAST.isCallExpression(node) && name === "whenIsRight" && node.arguments.length === 1;
}

/** `DEither.whenIsRight(entrée, fonction)`. */
export async function whenIsRightExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "either-when-is-right-used-as-value");
	}

	if (node.arguments.length === 1) {
		// Forme curryfiée hors d'un pipe : il faudrait une fonction anonyme (décision n°5).
		return context.error(node, "either-when-is-right-curried-outside-pipe");
	}

	const [inputNode, callback] = node.arguments;

	if (!inputNode || !callback || node.arguments.length !== 2) {
		return context.error(node, "either-when-is-right-expects-two-arguments");
	}

	// Le type du résultat : souvent une union mélangée (Fail | readonly [number]) → any.
	const resultType = await transformTypeOfExpression(node, context);

	if (DEither.isLeft(resultType)) {
		return resultType;
	}

	const input = await DCommon.asyncPipe(
		context.transform(inputNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(input)) {
		return input;
	}

	const applied = await applyWhenIsRight(input.result, callback, resultType.result, context);

	if (DEither.isLeft(applied)) {
		return applied;
	}

	const { before, identifier } = DEither.unwrapRight(applied);

	return context.success({
		before: DArray.concat(resultType.before, input.before, before),
		result: identifier,
	});
}

/**
 * `DEither.whenIsRightOtherwise(entrée, fonctionSucces, fonctionEchec)`.
 * Même code en ligne que whenIsRight, mais la branche `else` appelle la 2e fonction
 * avec l'Either entier, comme DuploJS : `return otherwiseFunction(input)`.
 */
export async function whenIsRightOtherwiseExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "either-when-is-right-otherwise-used-as-value");
	}

	if (node.arguments.length === 2) {
		// Forme curryfiée hors d'un pipe : il faudrait une fonction anonyme (décision n°5).
		return context.error(node, "either-when-is-right-otherwise-curried-outside-pipe");
	}

	const [inputNode, callback, otherwiseCallback] = node.arguments;

	if (!inputNode || !callback || !otherwiseCallback || node.arguments.length !== 3) {
		return context.error(node, "either-when-is-right-otherwise-expects-three-arguments");
	}

	const resultType = await transformTypeOfExpression(node, context);

	if (DEither.isLeft(resultType)) {
		return resultType;
	}

	const input = await DCommon.asyncPipe(
		context.transform(inputNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(input)) {
		return input;
	}

	const applied = await applyWhenIsRight(input.result, callback, resultType.result, context, otherwiseCallback);

	if (DEither.isLeft(applied)) {
		return applied;
	}

	const { before, identifier } = DEither.unwrapRight(applied);

	return context.success({
		before: DArray.concat(resultType.before, input.before, before),
		result: identifier,
	});
}

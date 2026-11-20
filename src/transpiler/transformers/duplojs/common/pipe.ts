import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../context/build";
import { expressionTransformers } from "../../expression";
import { transformReturnTypeOfFunction } from "../../type/ofExpression";
import { inlineCallback } from "../../common/inlineCallback";
import { createSimpleAssignment } from "../../common";
import { applyWhenIsRight } from "../either/whenIsRight";
import { applyMap } from "../array/map";

type CurriedStep =
	| { kind: "whenIsRight"; callback: TsAST.Expression }
	| { kind: "whenIsRightOtherwise"; callback: TsAST.Expression; otherwiseCallback: TsAST.Expression }
	| { kind: "map"; callback: TsAST.Expression };

/**
 * Reconnaît une étape DuploJS curryfiée : `DEither.whenIsRight(f)`,
 * `DEither.whenIsRightOtherwise(f, g)` ou `DArray.map(f)`.
 * Ces formes renvoient une fonction en TS ; ici on les applique directement
 * à la valeur courante, sans fonction anonyme.
 */
async function getCurriedStep(step: TsAST.Expression, context: BuildContext): Promise<CurriedStep | undefined> {
	if (!TsAST.isCallExpression(step)) {
		return undefined;
	}

	const reference = step.expression;

	if (!TsAST.isIdentifier(reference) && !TsAST.isPropertyAccessExpression(reference)) {
		return undefined;
	}

	const [first, second] = step.arguments;

	const eitherReference = await DCommon.asyncPipe(
		context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/either\//),
		DEither.unwrapRight,
	);

	if (!DEither.isLeft(eitherReference)) {
		const name = eitherReference.symbol.name;

		if (name === "whenIsRight" && first && step.arguments.length === 1) {
			return { kind: "whenIsRight", callback: first };
		}

		if (name === "whenIsRightOtherwise" && first && second && step.arguments.length === 2) {
			return { kind: "whenIsRightOtherwise", callback: first, otherwiseCallback: second };
		}

		return undefined;
	}

	const arrayReference = await DCommon.asyncPipe(
		context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/array\//),
		DEither.unwrapRight,
	);

	if (!DEither.isLeft(arrayReference) && arrayReference.symbol.name === "map" && first && step.arguments.length === 1) {
		return { kind: "map", callback: first };
	}

	return undefined;
}

/**
 * `DCommon.pipe(entrée, étape1, étape2, …)` = `étape2(étape1(entrée))`.
 *
 * Code en ligne (décision n°5) : pas de fonction Go `Pipe`, pas de fonction anonyme.
 * Le nombre d'étapes est connu à la traduction, on « déroule » donc la boucle de DuploJS :
 *
 *   Generated_1 := <entrée>
 *   ...étape 1 recopiée en ligne avec Generated_1  -> Generated_2
 *   ...étape 2 recopiée en ligne avec Generated_2  -> Generated_3
 *   -> résultat : Generated_3
 *
 * Une étape curryfiée (`whenIsRight(f)`, `whenIsRightOtherwise(f, g)`, `DArray.map(f)`)
 * réutilise le cœur de la fonction correspondante au lieu de fabriquer une fonction anonyme.
 */
export async function pipeExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "common-pipe-used-as-value");
	}

	const [inputNode, ...steps] = node.arguments;

	if (!inputNode) {
		return context.error(node, "common-pipe-expects-an-input");
	}

	const input = await DCommon.asyncPipe(
		context.transform(inputNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(input)) {
		return input;
	}

	const inputStatement = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: input.result,
	});

	let before: GoAST.Statement[] = [...input.before, inputStatement];
	let current: GoAST.Identifier = inputStatement.identifier;

	for (const step of steps) {
		const curriedStep = await getCurriedStep(step, context);

		if (curriedStep) {
			// Étape curryfiée : type du résultat = ce que renvoie la fonction produite par l'étape.
			const resultType = await transformReturnTypeOfFunction(step, context);

			if (DEither.isLeft(resultType)) {
				return resultType;
			}

			const applied = curriedStep.kind === "map"
				? await applyMap(current, curriedStep.callback, resultType.result, context)
				: await applyWhenIsRight(
					current,
					curriedStep.callback,
					resultType.result,
					context,
					curriedStep.kind === "whenIsRightOtherwise" ? curriedStep.otherwiseCallback : undefined,
				);

			if (DEither.isLeft(applied)) {
				return applied;
			}

			const { before: stepBefore, identifier } = DEither.unwrapRight(applied);

			before = [...before, ...resultType.before, ...stepBefore];
			current = identifier;
			continue;
		}

		// Toute autre étape (fonction fléchée ou passée par son nom) : recopiée en ligne.
		const inlined = await inlineCallback(step, current, context);

		if (DEither.isLeft(inlined)) {
			return inlined;
		}

		const { before: stepBefore, result } = DEither.unwrapRight(inlined);

		if (stepBefore.length === 0) {
			// Fonction passée par son nom : un simple appel, rien à isoler.
			const stepStatement = GoAST.createShortVariableDeclarationStatement({
				identifier: context.generateIdentifier(),
				initializer: result,
			});

			before = [...before, stepStatement];
			current = stepStatement.identifier;
			continue;
		}

		// Fonction fléchée recopiée en ligne : ses variables (`Sourced_value := …`)
		// vont dans un bloc `{ }` à part. Sans ça, deux étapes `(value) => …` dans le
		// même pipe déclareraient deux fois `Sourced_value` et Go refuserait de compiler.
		// Comme pour whenIsRight : on déclare le résultat avant le bloc, avec son type.
		const stepType = await transformReturnTypeOfFunction(step, context);

		if (DEither.isLeft(stepType)) {
			return stepType;
		}

		const output = GoAST.createVariableDeclarationZeroValue({
			identifier: context.generateIdentifier(),
			typeReference: stepType.result,
		});

		before = [
			...before,
			...stepType.before,
			output,
			GoAST.createBlockStatement({
				statements: DArray.push(
					stepBefore,
					createSimpleAssignment(output.identifier, result),
				),
			}),
		] as GoAST.Statement[];
		current = output.identifier;
	}

	return context.success({
		before,
		result: current,
	});
}

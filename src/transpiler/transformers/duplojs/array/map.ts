import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../context/build";
import { expressionTransformers } from "../../expression";
import { transformTypeOfExpression } from "../../type/ofExpression";
import { createSimpleAssignment } from "../../common";
import { inlineCallback } from "../../common/inlineCallback";

/**
 * Cœur de `DArray.map`, partagé par la forme à 2 arguments et par `pipe`
 * (forme curryfiée). Une boucle Go, la fonction recopiée en ligne (décision n°5) :
 *
 *   Generated_1 := <tableau>
 *   var Generated_2 []T
 *   for _, Generated_3 := range Generated_1 {
 *       ...fonction recopiée en ligne (inlineCallback) avec Generated_3
 *       Generated_2 = append(Generated_2, <résultat>)
 *   }
 *   -> résultat : Generated_2
 *
 * Limite : la fonction ne reçoit que l'élément. DuploJS lui passe aussi
 * `{ index, self }`, qu'aucun exercice n'utilise (une fonction à 2 paramètres est refusée).
 */
export async function applyMap(
	input: GoAST.Expression,
	callback: TsAST.Expression,
	resultType: GoAST.Type | GoAST.TypeReference,
	context: BuildContext,
) {
	const array = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: input,
	});

	const output = GoAST.createVariableDeclarationZeroValue({
		identifier: context.generateIdentifier(),
		typeReference: resultType,
	});

	const element = context.generateIdentifier();

	const inlined = await inlineCallback(callback, element, context);

	if (DEither.isLeft(inlined)) {
		return inlined;
	}

	const { before, result } = DEither.unwrapRight(inlined);

	return DEither.right("map", {
		before: [
			array,
			output,
			GoAST.createRangeStatement({
				binding: GoAST.createRangeDeclaration({
					key: GoAST.createIdentifier("_"),
					value: element,
				}),
				expression: array.identifier,
				body: GoAST.createBlockStatement({
					statements: DArray.push(
						before,
						createSimpleAssignment(
							output.identifier,
							GoAST.createCallExpression({
								callee: GoAST.createIdentifier("append"),
								arguments: [output.identifier, result],
							}),
						),
					),
				}),
			}),
		] as GoAST.Statement[],
		identifier: output.identifier,
	});
}

/** `DArray.map(tableau, fonction)`. */
export async function mapExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "array-map-used-as-value");
	}

	if (node.arguments.length === 1) {
		// Forme curryfiée hors d'un pipe : il faudrait une fonction anonyme (décision n°5).
		return context.error(node, "array-map-curried-outside-pipe");
	}

	const [arrayNode, callback] = node.arguments;

	if (!arrayNode || !callback || node.arguments.length !== 2) {
		return context.error(node, "array-map-expects-two-arguments");
	}

	const resultType = await transformTypeOfExpression(node, context);

	if (DEither.isLeft(resultType)) {
		return resultType;
	}

	const array = await DCommon.asyncPipe(
		context.transform(arrayNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(array)) {
		return array;
	}

	const applied = await applyMap(array.result, callback, resultType.result, context);

	if (DEither.isLeft(applied)) {
		return applied;
	}

	const { before, identifier } = DEither.unwrapRight(applied);

	return context.success({
		before: DArray.concat(resultType.before, array.before, before),
		result: identifier,
	});
}

import { type Transformer } from "@transformer";
import { GoAST, GoPrinter } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { transformReturnTypeOfFunction, transformTypeOfExpression } from "../../../type/ofExpression";
import { createSimpleAssignment } from "../../../common";
import { inlineCallback } from "../../../common/inlineCallback";
import { eitherIsRightFieldIdentifier, eitherRightFieldIdentifier } from "../sharedDependency";

/** Range le type Go dans un Either, pour filtrer les erreurs. */
async function toGoTypeEither(
	goType: ReturnType<typeof transformTypeOfExpression>,
) {
	const resolved = await goType;

	if (DEither.isLeft(resolved)) {
		return resolved;
	}

	return DEither.right("go-type", resolved.result);
}

/** Toutes les étapes doivent avoir le même type Go : elles partagent une variable. */
async function checkSameEitherType(
	node: TsAST.CallExpression,
	input: TsAST.Expression,
	steps: readonly TsAST.Expression[],
	context: BuildContext,
) {
	const goTypes = await DCommon.asyncPipe(
		[
			transformTypeOfExpression(node, context),
			transformTypeOfExpression(input, context),
			...DArray.map(steps, (step) => transformReturnTypeOfFunction(step, context)),
		],
		DArray.map(toGoTypeEither),
		DCommon.promiseAll,
	);

	const failedType = DArray.find(goTypes, DEither.isLeft);

	if (failedType) {
		return failedType;
	}

	const resolvedTypes = DArray.map(
		DArray.filter(goTypes, DEither.isRight),
		DEither.unwrapRight,
	);
	const rendered = DArray.map(resolvedTypes, (goType) => GoPrinter.renderNode(goType));
	const [resultType] = resolvedTypes;

	if (
		!resultType
		|| !DModeling.hasTagValue(resultType, "[node]type-reference-generic")
		|| DArray.some(rendered, (goType) => goType !== DArray.first(rendered))
	) {
		// Ex. une étape qui renvoie une valeur brute : limite documentée.
		return context.error(node, {
			reason: "either-right-pipe-types-differ",
			types: rendered,
		});
	}

	return DEither.right("same-either-type", resultType);
}

/**
 * rightPipe : une variable, puis un `if acc.IsRight { … }` par étape.
 * Après un échec, les étapes suivantes sont sautées, comme en TS.
 */
export async function rightPipeExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		// Passé comme valeur : non géré.
		return context.error(node, "either-right-pipe-used-as-value");
	}

	const [input, ...steps] = node.arguments;

	if (!input || DArray.lengthEqual(steps, 0)) {
		return context.error(node, "either-right-pipe-expects-steps");
	}

	const sameType = await checkSameEitherType(node, input, steps, context);

	if (DEither.isLeft(sameType)) {
		return sameType;
	}

	const either = await DCommon.asyncPipe(
		context.transform(input, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(either)) {
		return either;
	}

	const accumulator = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: either.result,
	});

	const stepStatements = await DCommon.asyncPipe(
		steps,
		DArray.map(
			async(step) => {
				const inlined = await inlineCallback(
					step,
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

				return DEither.right(
					"right-pipe-step",
					GoAST.createIfStatement({
						condition: GoAST.createSelectorExpression({
							target: accumulator.identifier,
							identifier: eitherIsRightFieldIdentifier,
						}),
						body: GoAST.createBlockStatement({
							statements: DArray.push(
								before,
								createSimpleAssignment(accumulator.identifier, result),
							),
						}),
					}),
				);
			},
		),
		DCommon.promiseAll,
	);

	const failedStep = DArray.find(stepStatements, DEither.isLeft);

	if (failedStep) {
		return failedStep;
	}

	return context.success({
		before: DArray.concat(
			either.before,
			[accumulator],
			DArray.map(
				DArray.filter(stepStatements, DEither.isRight),
				DEither.unwrapRight,
			),
		),
		result: accumulator.identifier,
	});
}

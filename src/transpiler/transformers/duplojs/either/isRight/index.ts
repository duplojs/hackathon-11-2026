import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { createUnionTagTest, resolveCheckerUnion } from "../../../type";

// `isRight` et `isLeft` sont des gardes de type (`input is Extract<Input, Right>`). Le checker fournit le type
// retenu par ce prédicat : chaque membre de l'union est classé à la compilation, et le test
// à l'exécution se réduit à une comparaison d'étiquette, sans inspection de la valeur.
export async function typeGuardExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "is-right-reference-without-call-not-supported");
	}

	const [inputNode] = node.arguments;

	if (!inputNode || !DArray.lengthEqual(node.arguments, 1)) {
		return context.error(node, "is-right-expects-one-argument");
	}

	const { typeChecker } = context.transpilation;

	const predicate = await typeChecker.getTypePredicateOfSignature(
		await typeChecker.getResolvedSignature(node),
	);

	if (!predicate?.type) {
		return context.error(node, "is-right-predicate-not-resolved");
	}

	const selectedType = predicate.type;

	const input = await DCommon.asyncPipe(
		context.transform(inputNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(input)) {
		return input;
	}

	const union = await resolveCheckerUnion(
		await typeChecker.getTypeAtLocation(inputNode),
		inputNode,
		context,
	);

	if (DEither.isLeft(union)) {
		return union;
	}

	const inputUnion = DEither.unwrapRight(union);

	const selectedIndexes = await DCommon.asyncPipe(
		inputUnion.sources,
		DArray.map(
			async(sources, { index }) => {
				const isSelected = await DCommon.asyncPipe(
					sources,
					DArray.map((source) => typeChecker.isTypeAssignableTo(source, selectedType)),
					DCommon.promiseAll,
				);

				return DArray.every(isSelected, DCommon.forward) ? index : undefined;
			},
		),
		DCommon.promiseAll,
		DArray.filter((index): index is number => index !== undefined),
	);

	const inputVariable = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier("checkedResult"),
		initializer: input.result,
	});

	const test = createUnionTagTest(inputVariable.identifier, inputUnion, selectedIndexes);

	// Un résultat connu à la compilation n'utilise pas la variable : elle est consommée
	// explicitement pour conserver l'évaluation de l'argument sans erreur « declared and not used ».
	const consumption = DModeling.hasTagValue(test, "[node][expression]literal-boolean")
		? [
			GoAST.createAssignmentStatement({
				targets: DCommon.cast([GoAST.createIdentifier("_")]),
				values: DCommon.cast([inputVariable.identifier]),
			}),
		]
		: [];

	return context.success({
		before: DArray.concat(input.before, [inputVariable], consumption),
		result: test,
	});
}

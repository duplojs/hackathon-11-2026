import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TypeFlags, type Type } from "typescript/async";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../context/build";
import { convertToCheckerType, transformCheckerType } from "../type";
import { expressionTransformers } from ".";

// Une branche est traduite avec ses préparations, qui restent dans la branche Go :
// seule la branche choisie est évaluée, comme avec l'opérateur ternaire.
async function transformBranch(
	node: TsAST.Expression,
	resultType: Type,
	result: GoAST.Identifier,
	context: BuildContext,
) {
	const branch = await DCommon.asyncPipe(
		context.transform(node, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(branch)) {
		return branch;
	}

	const value = await convertToCheckerType({
		expression: branch.result,
		source: await context.transpilation.typeChecker.getTypeAtLocation(node),
		target: resultType,
		location: node,
		context,
	});

	if (DEither.isLeft(value)) {
		return value;
	}

	return DEither.success(
		GoAST.createBlockStatement({
			statements: DArray.push(
				branch.before,
				GoAST.createAssignmentStatement({
					targets: DCommon.cast([result]),
					values: DCommon.cast([DEither.unwrapRight(value)]),
				}),
			),
		}),
	);
}

// Go n'a pas d'opérateur ternaire : `condition ? a : b` devient une variable du type de
// l'expression, affectée dans un `if` / `else`. La variable est ensuite la valeur de l'expression.
export const conditionalExpressionTransformer: Transformer<GoAST.Identifier> = createTransformer(
	async(node, context) => {
		if (!TsAST.isConditionalExpression(node)) {
			return context.notSupport();
		}

		const { typeChecker } = context.transpilation;
		const conditionType = await typeChecker.getTypeAtLocation(node.condition);

		// Comme pour `if`, la vérité d'une valeur non booléenne suit des règles absentes de Go.
		if (!(conditionType.flags & TypeFlags.BooleanLike)) {
			return context.error(node.condition, "non-boolean-condition-not-supported");
		}

		const condition = await DCommon.asyncPipe(
			context.transform(node.condition, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(condition)) {
			return condition;
		}

		const resultType = await typeChecker.getTypeAtLocation(node);
		const resultGoType = await transformCheckerType(resultType, node, context);

		if (DEither.isLeft(resultGoType)) {
			return resultGoType;
		}

		const result = context.generateIdentifier("ternaryResult");

		const whenTrue = await transformBranch(node.whenTrue, resultType, result, context);

		if (DEither.isLeft(whenTrue)) {
			return whenTrue;
		}

		const whenFalse = await transformBranch(node.whenFalse, resultType, result, context);

		if (DEither.isLeft(whenFalse)) {
			return whenFalse;
		}

		return context.success({
			before: DArray.concat(
				condition.before,
				[
					GoAST.createVariableDeclarationZeroValue({
						identifier: result,
						typeReference: DEither.unwrapRight(resultGoType),
					}),
					GoAST.createIfStatement({
						condition: condition.result,
						body: DEither.unwrapRight(whenTrue),
						elseBranch: DEither.unwrapRight(whenFalse),
					}),
				],
			),
			result,
		});
	},
);

import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { expressionTransformers } from "../expression";

// L'expression passe par la liste des expressions : les routeurs DuploJS reçoivent ainsi
// l'appel complet. Go n'accepte qu'un appel comme instruction ; une autre valeur est
// affectée à `_` pour conserver son évaluation.
export const expressionStatementTransformer: Transformer<
	| GoAST.CallExpression
	| GoAST.AssignmentStatement
> = createTransformer(
	async(node, context) => {
		if (!TsAST.isExpressionStatement(node)) {
			return context.notSupport();
		}

		const expression = await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(expression)) {
			return expression;
		}

		if (DModeling.hasTagValue(expression.result, "[node][expression][statement]call")) {
			return context.success({
				before: expression.before,
				result: expression.result,
			});
		}

		return context.success({
			before: expression.before,
			result: GoAST.createAssignmentStatement({
				targets: DCommon.cast([GoAST.createIdentifier("_")]),
				values: DCommon.cast([expression.result]),
			}),
		});
	},
);

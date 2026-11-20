import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { TypeFlags } from "typescript/async";
import { type BuildContext } from "../../context/build";
import { expressionTransformers } from "../expression";
import { statementTransformers } from ".";
import { blockStatementTransformer } from "./block";

/** Une branche Go est toujours un bloc `{ … }`. */
async function transformBranch(statement: TsAST.Statement, context: BuildContext) {
	if (TsAST.isBlock(statement)) {
		return DCommon.asyncPipe(
			context.transform(statement, [blockStatementTransformer]),
			DEither.unwrapRight,
		);
	}

	const transformed = await DCommon.asyncPipe(
		context.transform(statement, statementTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(transformed)) {
		return transformed;
	}

	return {
		before: [],
		result: GoAST.createBlockStatement({
			statements: DArray.push(transformed.before, transformed.result),
		}),
	};
}

/**
 * if TS -> if Go. Les préparations d'un else if restent dans le else.
 * La condition doit être un booléen.
 */
export const ifStatementTransformer: Transformer<GoAST.IfStatement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIfStatement(node)) {
			return context.notSupport();
		}

		const conditionType = await context.transpilation.typeChecker.getTypeAtLocation(node.expression);

		if (!(conditionType.flags & TypeFlags.BooleanLike)) {
			return context.error(node.expression, "if-condition-is-not-boolean");
		}

		const condition = await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(condition)) {
			return condition;
		}

		const body = await transformBranch(node.thenStatement, context);

		if (DEither.isLeft(body)) {
			return body;
		}

		if (!node.elseStatement) {
			return context.success({
				before: DArray.concat(condition.before, body.before),
				result: GoAST.createIfStatement({
					condition: condition.result,
					body: body.result,
				}),
			});
		}

		if (TsAST.isIfStatement(node.elseStatement)) {
			const elseIf = await DCommon.asyncPipe(
				context.transform(node.elseStatement, [ifStatementTransformer]),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(elseIf)) {
				return elseIf;
			}

			return context.success({
				before: DArray.concat(condition.before, body.before),
				result: GoAST.createIfStatement({
					condition: condition.result,
					body: body.result,
					// Préparations du else if : dans le else.
					elseBranch: elseIf.before.length === 0
						? elseIf.result
						: GoAST.createBlockStatement({
							statements: DArray.push(elseIf.before, elseIf.result),
						}),
				}),
			});
		}

		const elseBranch = await transformBranch(node.elseStatement, context);

		if (DEither.isLeft(elseBranch)) {
			return elseBranch;
		}

		return context.success({
			before: DArray.concat(condition.before, body.before, elseBranch.before),
			result: GoAST.createIfStatement({
				condition: condition.result,
				body: body.result,
				elseBranch: elseBranch.result,
			}),
		});
	},
);

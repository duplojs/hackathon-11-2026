import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../context/build";
import { expressionTransformers } from "../expression";
import { statementTransformers } from ".";
import { blockStatementTransformer } from "./block";

/**
 * Une branche devient toujours un bloc Go. Une instruction seule
 * (`if (c) return x;`) est enveloppée avec ses `before` : ils ne
 * s'exécutent que si la branche est prise.
 */
async function transformBranch(node: TsAST.Statement, context: BuildContext) {
	if (TsAST.isBlock(node)) {
		return DCommon.asyncPipe(
			context.transform(node, [blockStatementTransformer]),
			DEither.unwrapRight,
		);
	}

	const statement = await DCommon.asyncPipe(
		context.transform(node, statementTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(statement)) {
		return statement;
	}

	return {
		before: [],
		result: GoAST.createBlockStatement({
			statements: DArray.concat(statement.before, [statement.result]),
		}),
	};
}

/**
 * `if (c) { ... } else if (d) { ... } else { ... }` → même structure en Go.
 * Les `before` de la condition sont placés avant le `if` : comme en
 * TypeScript, la condition est toujours évaluée.
 */
export const ifStatementTransformer: Transformer<GoAST.IfStatement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIfStatement(node)) {
			return context.notSupport();
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

		const elseBranch = node.elseStatement
			&& await transformBranch(node.elseStatement, context);

		if (elseBranch && DEither.isLeft(elseBranch)) {
			return elseBranch;
		}

		return context.success({
			before: condition.before,
			result: GoAST.createIfStatement({
				condition: condition.result,
				body: body.result,
				elseBranch: elseBranch?.result,
			}),
		});
	},
);

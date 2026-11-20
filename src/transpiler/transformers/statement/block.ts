import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";
import * as DGenerator from "@duplojs/lang/generator";
import { statementTransformers } from ".";
import { isTypeOnlyStatement } from "../../typeOnlyStatement";

export const blockStatementTransformer: Transformer<GoAST.BlockStatement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isBlock(node)) {
			return context.notSupport();
		}

		const statements = await DCommon.asyncPipe(
			node.statements,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<readonly GoAST.Statement[]>([]),
				async({ item, lastValue, next, exit }) => {
					if (isTypeOnlyStatement(item)) {
						return next(lastValue);
					}

					const statement = await DCommon.asyncPipe(
						context.transform(item, statementTransformers.value),
						DEither.unwrapRight,
					);

					if (DEither.isLeft(statement)) {
						return exit(statement);
					}

					return next(
						DArray.concat(
							lastValue,
							statement.before,
							[statement.result],
						),
					);
				},
			),
		);

		if (DEither.isLeft(statements)) {
			return statements;
		}

		return context.success({
			result: GoAST.createBlockStatement({
				statements,
			}),
		});
	},
);

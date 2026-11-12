import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";
import { statementTransformers } from ".";

export const blockStatementTransformer: Transformer<GoAST.BlockStatement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isBlock(node)) {
			return context.notSupport();
		}

		const statements = await DCommon.asyncPipe(
			node.statements,
			DArray.map(
				async(tsArgument) => DCommon.asyncPipe(
					context.transform(tsArgument, statementTransformers.value),
					DEither.unwrapRight,
				),
			),
			DCommon.promiseAll,
			DArray.reduce(
				DArray.reduceFrom<readonly GoAST.Statement[]>([]),
				({ element, lastValue, next, exit }) => {
					if (DEither.isLeft(element)) {
						return exit(element);
					}

					return next(
						DArray.concat(
							lastValue,
							element.before,
							[element.result],
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

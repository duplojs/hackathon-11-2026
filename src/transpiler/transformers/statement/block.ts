import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import * as GO from "@go";
import * as TS from "typescript/ast";
import { createTransformer, type Transformer } from "../../factory";
import { statementTransformers } from "./index";

interface TransformedBlock {
	statements: readonly GO.AST.Statement[];
}

export const blockTransformer: Transformer<GO.AST.BlockStatement> = createTransformer(
	async(node, context) => {
		if (!TS.isBlock(node)) {
			return context.notSupport(node);
		}

		const body = await DCommon.asyncPipe(
			node.statements,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<TransformedBlock>({
					statements: [],
				}),
				async({ item, lastValue, next, exit }) => {
					const statement = await DCommon.asyncPipe(
						context.transform(item, statementTransformers.value),
						DEither.keepAsRightByInformation("transformation-success"),
						DEither.unwrapRight,
					);
					if (DEither.isLeft(statement)) {
						return exit(statement);
					}

					return next({
						statements: [...lastValue.statements, ...statement.before, statement.result],
					});
				},
			),
		);
		if (DEither.isLeft(body)) {
			return body;
		}

		return context.success({
			result: GO.AST.blockStatement({ statements: body.statements }),
		});
	},
);

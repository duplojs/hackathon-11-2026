import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import { expressionTransformers } from "../expression";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";

export const callExpressionTransformer: Transformer<GoAST.CallExpression> = createTransformer(
	async(rawNode, context) => {
		const node = TsAST.isExpressionStatement(rawNode)
			? rawNode.expression
			: rawNode;
		if (!TsAST.isCallExpression(node)) {
			return context.notSupport();
		}

		const callee = await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(callee)) {
			return callee;
		}

		const functionVariableStatement = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: callee.result,
		});

		const argumentsResult = await DCommon.asyncPipe(
			node.arguments,
			DArray.map(
				async(tsArgument) => DCommon.asyncPipe(
					context.transform(tsArgument, expressionTransformers.value),
					DEither.unwrapRight,
				),
			),
			DCommon.promiseAll,
			DArray.reduce(
				DArray.reduceFrom<{
					before: readonly GoAST.Statement[];
					arguments: readonly GoAST.Expression[];
				}>({
					before: [],
					arguments: [],
				}),
				({ element, lastValue, next, exit }) => {
					if (DEither.isLeft(element)) {
						return exit(element);
					}

					const argumentVariableStatement = GoAST.createShortVariableDeclarationStatement({
						identifier: context.generateIdentifier(),
						initializer: element.result,
					});

					return next({
						before: DArray.concat(
							lastValue.before,
							element.before,
							[argumentVariableStatement],
						),
						arguments: DArray.push(
							lastValue.arguments,
							argumentVariableStatement.identifier,
						),
					});
				},
			),
		);

		if (DEither.isLeft(argumentsResult)) {
			return argumentsResult;
		}

		return context.success({
			before: DArray.concat(
				callee.before,
				[functionVariableStatement],
				argumentsResult.before,
			),
			result: GoAST.createCallExpression({
				callee: functionVariableStatement.identifier,
				arguments: argumentsResult.arguments,
			}),
		});
	},
);

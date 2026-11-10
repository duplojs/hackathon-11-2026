import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import * as GO from "@go";
import * as TS from "typescript/ast";
import { createTransformer, type Transformer, type TransformationSuccessPayload } from "../../factory";
import { transformExpression } from "../helpers";

interface TransformedArguments {
	arguments: readonly GO.AST.Identifier[];
	before: TransformationSuccessPayload<GO.AST.CallExpression>["before"];
	topLevelDeclarations: GO.AST.TopLevelDeclaration[];
}

export const callExpressionTransformer: Transformer<GO.AST.CallExpression> = createTransformer(
	async(node, context, localContext) => {
		if (!TS.isCallExpression(node)) {
			return context.notSupport(node);
		}

		if (node.questionDotToken !== undefined || node.typeArguments !== undefined) {
			return context.notSupport(node);
		}

		if (DArray.some(node.arguments, TS.isSpreadElement)) {
			return context.notSupport(node);
		}

		const callee = await DCommon.asyncPipe(
			transformExpression(node.expression, context, localContext),
			DEither.keepAsRightByInformation("transformation-success"),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(callee)) {
			return callee;
		}

		if (DArray.lengthEqual(node.arguments, 0)) {
			return context.success({
				...callee,
				result: GO.AST.callExpression({
					callee: callee.result,
					arguments: [],
				}),
			});
		}

		const calleeIdentifier = context.createIdentifier();
		const argumentsList = await DCommon.asyncPipe(
			node.arguments,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<TransformedArguments>({
					arguments: [],
					before: [
						...callee.before,
						GO.AST.shortVariableDeclarationStatement({
							identifier: calleeIdentifier,
							initializer: callee.result,
						}),
					],
					topLevelDeclarations: callee.topLevelDeclarations,
				}),
				async({ item, lastValue, next, exit }) => {
					const argument = await DCommon.asyncPipe(
						transformExpression(item, context, localContext),
						DEither.keepAsRightByInformation("transformation-success"),
						DEither.unwrapRight,
					);
					if (DEither.isLeft(argument)) {
						return exit(argument);
					}

					const identifier = context.createIdentifier();
					return next({
						arguments: DArray.push(lastValue.arguments, identifier),
						before: [
							...lastValue.before,
							...argument.before,
							GO.AST.shortVariableDeclarationStatement({
								identifier,
								initializer: argument.result,
							}),
						],
						topLevelDeclarations: [
							...lastValue.topLevelDeclarations,
							...argument.topLevelDeclarations,
						],
					});
				},
			),
		);
		if (DEither.isLeft(argumentsList)) {
			return argumentsList;
		}

		return context.success({
			result: GO.AST.callExpression({
				callee: calleeIdentifier,
				arguments: argumentsList.arguments,
			}),
			before: argumentsList.before,
			topLevelDeclarations: argumentsList.topLevelDeclarations,
		});
	},
);

import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import { expressionTransformers } from "../expression";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";
import * as DModeling from "@duplojs/lang/modeling";
import { SymbolFlags } from "typescript/async";

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

		// Une fonction directe (déclaration, identifiant simple ou sélecteur de package/méthode)
		// est appelée directement sans variable intermédiaire.
		const { typeChecker } = context.transpilation;
		const calleeSymbol = await typeChecker.getSymbolAtLocation(node.expression);
		const calleeDeclarationSymbol = calleeSymbol && calleeSymbol.flags & SymbolFlags.Alias
			? await typeChecker.getAliasedSymbol(calleeSymbol)
			: calleeSymbol;
		const isFunctionDeclaration = !!calleeDeclarationSymbol
			&& !!(calleeDeclarationSymbol.flags & SymbolFlags.Function);

		const isDirectCallee = isFunctionDeclaration
			|| DModeling.hasTagValue(callee.result, "[node]identifier")
			|| DModeling.hasTagValue(callee.result, "[node][expression]selector");

		const functionVariableStatement = !isDirectCallee
			? GoAST.createShortVariableDeclarationStatement({
				identifier: context.generateIdentifier(),
				initializer: callee.result,
			})
			: undefined;

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

					return next({
						before: DArray.concat(
							lastValue.before,
							element.before,
						),
						arguments: DArray.push(
							lastValue.arguments,
							element.result,
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
				functionVariableStatement ? [functionVariableStatement] : [],
				argumentsResult.before,
			),
			result: GoAST.createCallExpression({
				callee: functionVariableStatement ? functionVariableStatement.identifier : callee.result,
				arguments: argumentsResult.arguments,
			}),
		});
	},
);

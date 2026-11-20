import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import { expressionTransformers } from "../expression";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";
import * as DGenerator from "@duplojs/lang/generator";
import type { BuildContext } from "../../context/build";
import { coerceGoExpression } from "../duplojs/either/coerce";
import { isExpectedTypeEitherConstructor } from "../duplojs/either/constructor";
import { goTypeOf, goTypeOfExpression } from "../type/goTypeOf";

/**
 * ADR-13 : argument converti vers le type Go du paramètre d'une FONCTION DU
 * PROJET (membre vers union étiquetée, Either[V] vers Either2…). Sans conversion
 * possible, l'argument reste tel quel (comportement antérieur).
 */
async function coerceArgumentsToParameters(
	node: TsAST.CallExpression,
	argumentExpressions: readonly GoAST.Expression[],
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;
	const signature = await typeChecker.getResolvedSignature(node);
	const declarationPath = signature?.declaration?.path;

	if (
		!signature
		|| signature.hasRestParameter
		|| !declarationPath
		|| declarationPath.includes("/node_modules/")
		|| /(?:^|\/)lib\.[\w.]*\.d\.ts$/.test(declarationPath)
	) {
		return argumentExpressions;
	}

	const parameters = await signature.getParameters();
	const coerced: GoAST.Expression[] = [];

	for (const [index, expression] of argumentExpressions.entries()) {
		const parameter = parameters[index];
		const argumentNode = node.arguments[index];

		if (!parameter || !argumentNode || await isExpectedTypeEitherConstructor(argumentNode, context)) {
			coerced.push(expression);
			continue;
		}

		const parameterGoType = DEither.unwrapRight(
			await goTypeOf(await typeChecker.getTypeOfSymbol(parameter), argumentNode, context),
		);
		const argumentGoType = DEither.unwrapRight(await goTypeOfExpression(argumentNode, context));

		if (DEither.isLeft(parameterGoType) || DEither.isLeft(argumentGoType)) {
			coerced.push(expression);
			continue;
		}

		const result = await coerceGoExpression({
			expression,
			fromGoType: argumentGoType.result,
			toGoType: parameterGoType.result,
			from: await typeChecker.getTypeAtLocation(argumentNode),
		}, context);

		coerced.push(DEither.isLeft(result) ? expression : DEither.unwrapRight(result).result);
	}

	return coerced;
}

export async function transformCallExpression(
	rawNode: TsAST.Node,
	context: BuildContext,
	directCallee?: GoAST.Expression,
) {
	const node = TsAST.isExpressionStatement(rawNode)
		? rawNode.expression
		: rawNode;
	if (!TsAST.isCallExpression(node)) {
		return context.notSupport();
	}

	const callee = directCallee
		? {
			result: directCallee,
			before: [],
		}
		: await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

	if (DEither.isLeft(callee)) {
		return callee;
	}

	const functionVariableStatement = directCallee
		? undefined
		: GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: callee.result,
		});

	const argumentsResult = await DCommon.asyncPipe(
		node.arguments,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<{
				before: readonly GoAST.Statement[];
				arguments: readonly GoAST.Expression[];
			}>({
				before: [],
				arguments: [],
			}),
			async({ item, lastValue, next, exit }) => {
				const argument = await DCommon.asyncPipe(
					context.transform(item, expressionTransformers.value),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(argument)) {
					return exit(argument);
				}

				const argumentVariableStatement = GoAST.createShortVariableDeclarationStatement({
					identifier: context.generateIdentifier(),
					initializer: argument.result,
				});

				return next({
					before: DArray.concat(
						lastValue.before,
						argument.before,
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

	const callArguments = directCallee
		? argumentsResult.arguments
		: await coerceArgumentsToParameters(node, argumentsResult.arguments, context);

	return context.success({
		before: DArray.concat(
			callee.before,
			functionVariableStatement ? [functionVariableStatement] : [],
			argumentsResult.before,
		),
		result: GoAST.createCallExpression({
			callee: functionVariableStatement
				? functionVariableStatement.identifier
				: callee.result,
			arguments: callArguments,
		}),
	});
}

export const callExpressionTransformer: Transformer<GoAST.CallExpression> = createTransformer(
	(rawNode, context) => transformCallExpression(rawNode, context),
);

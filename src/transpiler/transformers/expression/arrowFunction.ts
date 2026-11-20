import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { goTypeOf } from "../type/goTypeOf";
import { blockStatementTransformer } from "../statement/block";
import { expressionTransformers } from ".";
import { bindArrayPattern } from "./bindArrayPattern";

/**
 * Fonction fléchée (ADR-7) : `func` literal Go.
 * - Paramètres : types de la signature de la fonction fléchée, déjà instanciés par
 *   le contexte en TypeScript (`(value) => …` passé à matchInformation : number).
 * - Retour : type de retour de cette signature, traduit en Go.
 * - Corps-expression : `return expr` (ses `before` en tête du corps) ;
 *   corps-bloc : ses instructions (le `return` final est obligatoire en Go).
 * Les closures JS et Go capturent toutes deux par référence : la sémantique des
 * variables capturées est conservée.
 */
export const arrowFunctionTransformer: Transformer<GoAST.FunctionLiteral> = createTransformer(
	async(node, context) => {
		if (!TsAST.isArrowFunction(node) && !TsAST.isFunctionExpression(node)) {
			return context.notSupport();
		}

		if (node.asteriskToken) {
			return context.error(node, "generator-function-not-supported");
		}

		const { typeChecker } = context.transpilation;
		const signature = await typeChecker.getSignatureFromDeclaration(node);

		const transformedParameters = await DCommon.asyncPipe(
			node.parameters,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<{
					arguments: readonly GoAST.FunctionArgument[];
					bindings: readonly GoAST.Statement[];
				}>({
					arguments: [],
					bindings: [],
				}),
				async({ item, index, lastValue, next, exit }) => {
					if (item.dotDotDotToken || item.initializer) {
						return exit(context.error(item, "rest-or-default-parameters-are-not-supported"));
					}

					const goType = DEither.unwrapRight(
						await goTypeOf(await typeChecker.getParameterType(signature, index), item, context),
					);

					if (DEither.isLeft(goType)) {
						return exit(goType);
					}

					if (TsAST.isIdentifier(item.name)) {
						return next({
							...lastValue,
							arguments: DArray.push(
								lastValue.arguments,
								GoAST.createFunctionArgument({
									identifier: context.createSourceIdentifier(item.name.text),
									type: goType.result,
								}),
							),
						});
					}

					if (!TsAST.isArrayBindingPattern(item.name)) {
						return exit(context.error(item.name, "object-destructuring-parameters-are-not-supported"));
					}

					const parameterIdentifier = context.generateIdentifier();
					const bindings = DEither.unwrapRight(
						await bindArrayPattern({
							pattern: item.name,
							source: parameterIdentifier,
							sourceGoType: goType.result,
							context,
						}),
					);

					if (DEither.isLeft(bindings)) {
						return exit(bindings);
					}

					return next({
						arguments: DArray.push(
							lastValue.arguments,
							GoAST.createFunctionArgument({
								identifier: parameterIdentifier,
								type: goType.result,
							}),
						),
						bindings: DArray.concat(lastValue.bindings, bindings),
					});
				},
			),
		);

		if (DEither.isLeft(transformedParameters)) {
			return transformedParameters;
		}
		const { arguments: functionArguments, bindings } = transformedParameters;

		const returnGoType = DEither.unwrapRight(
			await goTypeOf(await typeChecker.getReturnTypeOfSignature(signature), node, context),
		);

		if (DEither.isLeft(returnGoType)) {
			return returnGoType;
		}

		const { body } = node;

		if (TsAST.isBlock(body)) {
			const block = DEither.unwrapRight(await context.transform(body, [blockStatementTransformer]));

			if (DEither.isLeft(block)) {
				return block;
			}

			return context.success({
				result: GoAST.createFunctionLiteral({
					arguments: functionArguments,
					returnTypes: [returnGoType.result],
					body: GoAST.createBlockStatement({
						statements: [...bindings, ...block.before, ...block.result.statements],
					}),
				}),
			});
		}

		const expression = DEither.unwrapRight(await context.transform(body, expressionTransformers.value));

		if (DEither.isLeft(expression)) {
			return expression;
		}

		return context.success({
			result: GoAST.createFunctionLiteral({
				arguments: functionArguments,
				returnTypes: [returnGoType.result],
				body: GoAST.createBlockStatement({
					statements: [
						...bindings,
						...expression.before,
						GoAST.createReturnStatement({ values: [expression.result] }),
					],
				}),
			}),
		});
	},
);

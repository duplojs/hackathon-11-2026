import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import { typeTransformers } from "../type";
import * as DEither from "@duplojs/lang/either";
import { blockStatementTransformer } from "../statement/block";
import { TypeFlags } from "typescript/async";
import { type BuildContext } from "../../context/build";

/**
 * Type Go du retour d'une fonction déclarée : annotation, sinon type de retour
 * inféré de la signature. `void` (aucune valeur renvoyée) : pas de type de retour Go.
 */
export async function resolveFunctionReturnGoType(
	node: TsAST.FunctionDeclaration,
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;
	const signature = await typeChecker.getSignatureFromDeclaration(node);
	const signatureReturnType = await typeChecker.getReturnTypeOfSignature(signature);

	if (
		node.type?.kind === TsAST.SyntaxKind.VoidKeyword
		|| (!node.type && (signatureReturnType.flags & TypeFlags.Void) !== 0)
	) {
		return DEither.right("function-return-type", "void" as const);
	}

	const returnTypeNode = node.type ?? await typeChecker.typeToTypeNode(
		signatureReturnType,
		node,
		1 /* NoTruncation */,
	) ?? TsAST.factory.createKeywordTypeNode(TsAST.SyntaxKind.AnyKeyword);

	const returnType = await DCommon.asyncPipe(
		context.transform(returnTypeNode, typeTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(returnType)) {
		return returnType;
	}

	if (!DArray.lengthEqual(returnType.before, 0)) {
		return context.error(returnTypeNode, "un-support-before-on-return-type");
	}

	return DEither.right("function-return-type", returnType.result);
}

export const functionDeclarationTransformer: Transformer<GoAST.FunctionDeclaration> = createTransformer(
	async(node, context) => {
		if (!TsAST.isFunctionDeclaration(node) || !node.name || !node.body) {
			return context.notSupport();
		}

		if (node.asteriskToken) {
			return context.error(node, "generator-function-not-supported");
		}

		const functionIdentifier = node.parent?.kind === TsAST.SyntaxKind.SourceFile
			? context.createTopLevelIdentifier(context.file.currentFilePath, node.name.text)
			: context.createSourceIdentifier(node.name.text);

		const functionArguments = await DCommon.asyncPipe(
			node.parameters,
			DArray.map(
				(parameters) => DCommon.asyncPipe(
					context.transform(
						parameters.type ?? TsAST.factory.createKeywordTypeNode(TsAST.SyntaxKind.AnyKeyword),
						typeTransformers.value,
					),
					DEither.whenIsRight(
						({ before, result }) => {
							if (!DArray.lengthEqual(before, 0)) {
								return context.error(parameters, "un-support-before-on-parameter");
							}

							if (!TsAST.isIdentifier(parameters.name)) {
								return context.error(parameters, "params-name-is-not-identifier");
							}

							return GoAST.createFunctionArgument({
								identifier: context.createSourceIdentifier(parameters.name.text),
								type: result,
							});
						},
					),
				),
			),
			DCommon.promiseAll,
			DArray.reduce(
				DArray.reduceFrom<readonly GoAST.FunctionArgument[]>([]),
				({ element, lastValue, next, exit }) => {
					if (DEither.isLeft(element)) {
						return exit(element);
					}

					return next(
						DArray.push(
							lastValue,
							element,
						),
					);
				},
			),
		);

		if (DEither.isLeft(functionArguments)) {
			return functionArguments;
		}

		const returnType = DEither.unwrapRight(await resolveFunctionReturnGoType(node, context));

		if (DEither.isLeft(returnType)) {
			return returnType;
		}

		const body = await DCommon.asyncPipe(
			context.transform(node.body, [blockStatementTransformer]),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(body)) {
			return body;
		}

		if (!DArray.lengthEqual(body.before, 0)) {
			return context.error(node, "un-support-before-on-block-statement");
		}

		return context.success({
			result: GoAST.createFunctionDeclaration({
				identifier: functionIdentifier,
				arguments: functionArguments,
				returnTypes: returnType === "void" ? [] : [returnType],
				body: body.result,
				generic: [],
			}),
		});
	},
);

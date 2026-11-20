import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import type { GoType } from "./checkerType";

// Un type fonction `(value: A) => B` devient le type fonction Go `func(A) B` : une fonction peut
// ainsi être rangée dans une variable (forme curryfiée d'une fonction DuploJS, par exemple).
// Un paramètre optionnel ou de reste n'a pas d'équivalent direct en Go.
export const functionTypeTransformer: Transformer<GoAST.FunctionType> = createTransformer(
	async(node, context) => {
		if (!TsAST.isFunctionTypeNode(node)) {
			return context.notSupport();
		}

		const translate = async(typeNode: TsAST.TypeNode) => {
			const translated = await DCommon.asyncPipe(
				context.transform(typeNode, typeTransformers.value),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(translated)) {
				return translated;
			}

			return DArray.lengthEqual(translated.before, 0)
				? DEither.success<GoType>(translated.result)
				: context.error(node, "un-support-before-on-function-type");
		};

		const functionArguments = await DCommon.asyncPipe(
			node.parameters,
			DArray.map(
				async(parameter) => !parameter.type || parameter.dotDotDotToken || parameter.questionToken
					? context.error(parameter, "function-type-parameter-not-supported")
					: translate(parameter.type),
			),
			DCommon.promiseAll,
			DArray.reduce(
				DArray.reduceFrom<readonly GoAST.FunctionArgument[]>([]),
				({ element, lastValue, next, exit }) => DEither.isLeft(element)
					? exit(element)
					: next(
						DArray.push(
							lastValue,
							GoAST.createFunctionArgument({
								identifier: GoAST.createIdentifier("_"),
								type: DEither.unwrapRight(element),
							}),
						),
					),
			),
		);

		if (DEither.isLeft(functionArguments)) {
			return functionArguments;
		}

		if (!node.type) {
			return context.error(node, "function-type-without-return-type");
		}

		const returnType = await translate(node.type);

		if (DEither.isLeft(returnType)) {
			return returnType;
		}

		return context.success({
			result: GoAST.createFunctionType({
				arguments: functionArguments,
				returnTypes: [DEither.unwrapRight(returnType)],
			}),
		});
	},
);

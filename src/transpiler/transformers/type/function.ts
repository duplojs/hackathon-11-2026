import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import { type GoType } from "./goTypeOf";

/**
 * Type fonction `(a: A) => R` : `func(A) R` (ex. constante de premier niveau qui
 * contient une fonction fléchée : sa variable de package Go a ce type).
 * Les fonctions génériques n'ont pas de type valeur en Go : notSupport (D1, ADR-7).
 */
export const functionTypeTransformer: Transformer<GoAST.FunctionType> = createTransformer(
	async(node, context) => {
		if (!TsAST.isFunctionTypeNode(node)) {
			return context.notSupport();
		}

		if (node.typeParameters && node.typeParameters.length > 0) {
			return context.notSupport();
		}

		const parameterTypes = await DCommon.asyncPipe(
			node.parameters,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<readonly GoType[]>([]),
				async({ item, lastValue, next, exit }) => {
					if (!item.type || item.dotDotDotToken) {
						return exit(context.error(item, "function-type-parameter-not-supported"));
					}

					const goType = DEither.unwrapRight(await context.transform(item.type, typeTransformers.value));

					return DEither.isLeft(goType)
						? exit(goType)
						: next(DArray.push(lastValue, goType.result));
				},
			),
		);

		if (DEither.isLeft(parameterTypes)) {
			return parameterTypes;
		}

		if (!node.type) {
			return context.error(node, "function-type-without-return-type");
		}

		const returnType = DEither.unwrapRight(await context.transform(node.type, typeTransformers.value));

		if (DEither.isLeft(returnType)) {
			return returnType;
		}

		return context.success({
			result: GoAST.createFunctionType({
				arguments: DArray.map(
					parameterTypes,
					(type) => GoAST.createFunctionArgument({
						identifier: GoAST.createIdentifier("_"),
						type,
					}),
				),
				returnTypes: [returnType.result],
			}),
		});
	},
);

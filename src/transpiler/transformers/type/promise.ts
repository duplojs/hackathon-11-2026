import { createTransformer, type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { typeTransformers } from ".";

// `Promise<T>` : en Go, il n'y a pas de boucle d'événements JS ni de type Promise.
// Le type Go d'une Promise<T> est directement la représentation de T.
export const promiseTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async (node, context) => {
		if (!TsAST.isTypeReferenceNode(node)) {
			return context.notSupport();
		}

		const typeName = TsAST.isIdentifier(node.typeName)
			? node.typeName.text
			: undefined;

		if (typeName !== "Promise") {
			return context.notSupport();
		}

		const [typeArgument] = node.typeArguments ?? [];

		if (!typeArgument) {
			return context.success({
				result: GoAST.builtinTypeReferences.any,
			});
		}

		const result = await DCommon.asyncPipe(
			context.transform(typeArgument, typeTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(result)) {
			return result;
		}

		if (!DArray.lengthEqual(result.before, 0)) {
			return context.error(node, "un-support-before-on-type");
		}

		return context.success({
			result: result.result,
		});
	},
);

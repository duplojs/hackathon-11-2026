import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST, GoPrinter } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import type { GoType } from "./checkerType";

// Un tuple a une longueur fixe et chaque position a un rôle : il devient un tableau Go `[N]T`,
// dont la longueur fait partie du type. La cardinalité est donc vérifiée par le compilateur Go
// et la position reste l'index (`tuple[0]`, `tuple[1]`…), comme en TypeScript.
// Un tableau Go n'a qu'un type d'élément : seuls les tuples homogènes sont traduits.
export const tupleTypeTransformer: Transformer<GoAST.ArrayType> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTupleTypeNode(node)) {
			return context.notSupport();
		}

		const elementTypes = await DCommon.asyncPipe(
			node.elements,
			DArray.map(
				async(element) => {
					const elementNode = TsAST.isNamedTupleMember(element)
						? element.type
						: element;

					if (
						TsAST.isRestTypeNode(elementNode)
						|| TsAST.isOptionalTypeNode(elementNode)
						|| (TsAST.isNamedTupleMember(element) && (element.dotDotDotToken || element.questionToken))
					) {
						return context.error(element, "tuple-variable-length-not-supported");
					}

					return DCommon.asyncPipe(
						context.transform(elementNode, typeTransformers.value),
						DEither.unwrapRight,
					);
				},
			),
			DCommon.promiseAll,
			DArray.reduce(
				DArray.reduceFrom<readonly GoType[]>([]),
				({ element, lastValue, next, exit }) => {
					if (DEither.isLeft(element)) {
						return exit(element);
					}

					if (!DArray.lengthEqual(element.before, 0)) {
						return exit(context.error(node, "un-support-before-on-tuple-element-type"));
					}

					return next(DArray.push(lastValue, element.result));
				},
			),
		);

		if (DEither.isLeft(elementTypes)) {
			return elementTypes;
		}

		const [firstType] = elementTypes;

		if (!firstType) {
			return context.error(node, "empty-tuple-not-supported");
		}

		const firstKey = GoPrinter.renderNode(firstType);

		if (!DArray.every(elementTypes, (elementType) => GoPrinter.renderNode(elementType) === firstKey)) {
			return context.error(node, "heterogeneous-tuple-not-supported");
		}

		return context.success({
			result: GoAST.createArrayType({
				length: GoAST.createIntegerLiteral({ value: BigInt(elementTypes.length) }),
				elementType: firstType,
			}),
		});
	},
);

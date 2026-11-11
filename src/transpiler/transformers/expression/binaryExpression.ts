import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as GO from "@go";
import * as TS from "typescript/ast";
import { createTransformer, type Transformer } from "../../factory";
import { transformExpression } from "../helpers";

export const binaryExpressionTransformer: Transformer<GO.AST.BinaryExpression> = createTransformer(
	async(node, context) => {
		if (!TS.isBinaryExpression(node)) {
			return context.notSupport(node);
		}

		if (node.operatorToken.kind !== TS.SyntaxKind.PlusToken) {
			return context.notSupport(node);
		}

		const left = await DCommon.asyncPipe(
			transformExpression(node.left, context),
			DEither.keepAsRightByInformation("transformation-success"),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(left)) {
			return left;
		}

		const right = await DCommon.asyncPipe(
			transformExpression(node.right, context),
			DEither.keepAsRightByInformation("transformation-success"),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(right)) {
			return right;
		}

		// Ce refus concerne le placement du résultat enfant, pas l'éligibilité du nœud.
		if (!DArray.lengthEqual(right.before, 0)) {
			return context.error({
				reason: "unsupported-binary-preparation",
				node,
			});
		}

		return context.success({
			result: GO.AST.binaryExpression({
				operator: "+",
				left: left.result,
				right: right.result,
			}),
			before: left.before,
		});
	},
);

import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from "../expression";
import { type BuildContext } from "../../context/build";
import { resolveFunctionReturnGoType } from "../declaration/function";
import { coerceGoExpression } from "../duplojs/either/coerce";
import { goTypeOfExpression } from "../type/goTypeOf";
import { isExpectedTypeEitherConstructor } from "../duplojs/either/constructor";

function findEnclosingFunction(node: TsAST.Node): TsAST.Node | undefined {
	if (TsAST.isFunctionLikeDeclaration(node)) {
		return node;
	}

	return node.parent && findEnclosingFunction(node.parent);
}

/**
 * ADR-13 : la valeur renvoyée par une FONCTION DÉCLARÉE est convertie vers son
 * type de retour Go (TypeScript l'autorise implicitement, Go non) : membre vers
 * union étiquetée, Either[V] vers Either2[L, R]… Sans conversion possible, la
 * valeur est laissée telle quelle (comportement antérieur). Les fonctions
 * fléchées gardent leur propre mécanisme (ADR-7).
 */
async function coerceReturnedValue(
	node: TsAST.ReturnStatement & { expression: TsAST.Expression },
	expression: GoAST.Expression,
	context: BuildContext,
) {
	const enclosingFunction = findEnclosingFunction(node.parent);

	if (
		!enclosingFunction
		|| !TsAST.isFunctionDeclaration(enclosingFunction)
		|| await isExpectedTypeEitherConstructor(node.expression, context)
	) {
		return expression;
	}

	const returnGoType = DEither.unwrapRight(await resolveFunctionReturnGoType(enclosingFunction, context));
	const valueGoType = DEither.unwrapRight(await goTypeOfExpression(node.expression, context));

	if (DEither.isLeft(returnGoType) || returnGoType === "void" || DEither.isLeft(valueGoType)) {
		return expression;
	}

	const coerced = await coerceGoExpression({
		expression,
		fromGoType: valueGoType.result,
		toGoType: returnGoType,
		from: await context.transpilation.typeChecker.getTypeAtLocation(node.expression),
	}, context);

	return DEither.isLeft(coerced) ? expression : DEither.unwrapRight(coerced).result;
}

export const returnStatementTransformer: Transformer<GoAST.ReturnStatement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isReturnStatement(node)) {
			return context.notSupport();
		}

		if (!node.expression) {
			return context.success({
				result: GoAST.createReturnStatement({ values: [] }),
			});
		}

		const expression = await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(expression)) {
			return expression;
		}

		return context.success({
			before: expression.before,
			result: GoAST.createReturnStatement({
				values: [
					await coerceReturnedValue(
						node as TsAST.ReturnStatement & { expression: TsAST.Expression },
						expression.result,
						context,
					),
				],
			}),
		});
	},
);

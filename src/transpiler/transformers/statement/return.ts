import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from "../expression";
import { convertToCheckerType } from "../type";

function findEnclosingFunction(node: TsAST.Node): TsAST.Node | undefined {
	if (
		TsAST.isFunctionDeclaration(node)
		|| TsAST.isFunctionExpression(node)
		|| TsAST.isArrowFunction(node)
		|| TsAST.isMethodDeclaration(node)
	) {
		return node;
	}

	return node.parent && findEnclosingFunction(node.parent);
}

export const returnStatementTransformer: Transformer<GoAST.ReturnStatement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isReturnStatement(node) || !node.expression) {
			return context.notSupport();
		}

		const enclosingFunction = findEnclosingFunction(node);

		if (!enclosingFunction) {
			return context.error(node, "return-outside-function");
		}

		const expression = await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(expression)) {
			return expression;
		}

		const { typeChecker } = context.transpilation;

		// La valeur retournée prend la représentation du type de retour de la fonction,
		// par exemple un `Success` placé dans l'union `Success | Fail` déclarée.
		const value = await convertToCheckerType({
			expression: expression.result,
			source: await typeChecker.getTypeAtLocation(node.expression),
			target: await typeChecker.getReturnTypeOfSignature(
				await typeChecker.getSignatureFromDeclaration(enclosingFunction),
			),
			location: node,
			context,
		});

		if (DEither.isLeft(value)) {
			return value;
		}

		return context.success({
			before: expression.before,
			result: GoAST.createReturnStatement({
				values: [DEither.unwrapRight(value)],
			}),
		});
	},
);

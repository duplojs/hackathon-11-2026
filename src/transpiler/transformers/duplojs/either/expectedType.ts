import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import { type BuildContext } from "../../../context/build";

type EnclosingFunction = (
	| TsAST.FunctionDeclaration
	| TsAST.FunctionExpression
	| TsAST.ArrowFunction
	| TsAST.MethodDeclaration
);

function findEnclosingFunction(node: TsAST.Node | undefined): EnclosingFunction | undefined {
	if (!node) {
		return undefined;
	}

	if (
		TsAST.isFunctionDeclaration(node)
		|| TsAST.isFunctionExpression(node)
		|| TsAST.isArrowFunction(node)
		|| TsAST.isMethodDeclaration(node)
	) {
		return node;
	}

	return findEnclosingFunction(node.parent);
}

/**
 * Type attendu pour un Either : Go ne convertit pas `Either[A, B]` en
 * `Either[C, D]`, il faut le construire directement avec le bon type.
 * Pour un return : le type de retour de la fonction.
 */
export async function getExpectedEitherType(
	expression: TsAST.Expression,
	context: BuildContext,
): Promise<Type> {
	const checker = context.transpilation.typeChecker;
	const enclosingFunction = TsAST.isReturnStatement(expression.parent)
		? findEnclosingFunction(expression.parent)
		: undefined;

	if (enclosingFunction) {
		const signature = await checker.getSignatureFromDeclaration(enclosingFunction);

		return checker.getReturnTypeOfSignature(signature);
	}

	return await checker.getContextualType(expression) ?? checker.getTypeAtLocation(expression);
}

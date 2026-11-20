import { TsAST } from "@typescript";

// Nom lisible pour la variable Go qui reçoit la valeur d'une expression TypeScript :
// `one` → `one`, `DEither.success` → `success`, `add(1, 2)` → `addResult`, `(value) => …` → `callback`.
// Les autres expressions (littéraux, opérations…) prennent le nom de leur rôle (`fallback`).
export function getReadableName(node: TsAST.Node | undefined, fallback: string): string {
	if (!node) {
		return fallback;
	}

	if (TsAST.isIdentifier(node)) {
		return node.text;
	}

	if (TsAST.isPropertyAccessExpression(node)) {
		return node.name.text;
	}

	if (TsAST.isCallExpression(node)) {
		return `${getReadableName(node.expression, "call")}Result`;
	}

	if (TsAST.isArrowFunction(node) || TsAST.isFunctionExpression(node)) {
		return "callback";
	}

	if (TsAST.isParenthesizedExpression(node) || TsAST.isAwaitExpression(node)) {
		return getReadableName(node.expression, fallback);
	}

	return fallback;
}

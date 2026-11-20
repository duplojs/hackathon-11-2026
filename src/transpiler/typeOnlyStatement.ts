import { TsAST } from "@typescript";

/**
 * Instruction qui n'existe qu'au niveau des TYPES (aucun code JS émis) : alias
 * de type, interface, `declare`, export de types seuls. Les types sont résolus
 * par le checker à chaque usage : rien à produire en Go.
 */
export function isTypeOnlyStatement(node: TsAST.Node) {
	if (TsAST.isTypeAliasDeclaration(node) || TsAST.isInterfaceDeclaration(node)) {
		return true;
	}

	if (TsAST.isExportDeclaration(node)) {
		return node.isTypeOnly;
	}

	const modifiers = "modifiers" in node && Array.isArray(node.modifiers)
		? node.modifiers as readonly TsAST.Node[]
		: [];

	return modifiers.some((modifier) => modifier.kind === TsAST.SyntaxKind.DeclareKeyword);
}

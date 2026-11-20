import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { BuildContext } from "../../context/build";
import type { NotfoundTransformer, TransformationError } from "@transformer";
import { isTopLevelDeclarationName } from "../../resolvedReference";
import { goTypeOf, type GoType } from "../type/goTypeOf";
import { canNarrowUnion, narrowUnionExpression } from "../type/taggedUnion";

function collectIdentifiers(root: TsAST.Node) {
	const identifiers: TsAST.Identifier[] = [];

	const visit = (node: TsAST.Node) => {
		if (TsAST.isIdentifier(node)) {
			identifiers.push(node);
		}

		node.forEachChild(visit);
	};

	visit(root);

	return identifiers;
}

async function isRead(
	identifier: TsAST.Identifier,
	candidates: readonly TsAST.Identifier[],
	context: BuildContext,
) {
	const checker = context.transpilation.typeChecker;
	const symbol = await checker.getSymbolAtLocation(identifier);

	if (!symbol) {
		return context.error(identifier, "unable-to-resolve-destructured-symbol");
	}

	for (const candidate of candidates) {
		if (candidate === identifier) {
			continue;
		}

		const candidateSymbol = await checker.getSymbolAtLocation(candidate);

		if (candidateSymbol?.id === symbol.id) {
			return DEither.right("binding-read", true);
		}
	}

	return DEither.right("binding-read", false);
}

export async function bindArrayPattern(params: {
	pattern: TsAST.ArrayBindingPattern;
	source: GoAST.Identifier;
	sourceGoType: GoType;
	context: BuildContext;
}): Promise<
	| DEither.Right<"bindings", readonly GoAST.Statement[]>
	| TransformationError
	| NotfoundTransformer
> {
	const { pattern, source, sourceGoType, context } = params;

	if (!DModeling.hasTagValue(sourceGoType, "[node][type]slice")) {
		return context.error(pattern, "array-destructuring-source-is-not-a-slice");
	}

	const bindings: TsAST.BindingElement[] = [];

	for (const element of pattern.elements) {
		if (
			!element
			|| TsAST.isOmittedExpression(element)
			|| !TsAST.isBindingElement(element)
		) {
			return context.error(pattern, "omitted-destructuring-elements-are-not-supported");
		}

		if (element.dotDotDotToken) {
			return context.error(element, "rest-destructuring-is-not-supported");
		}

		if (element.initializer) {
			return context.error(element, "default-destructuring-values-are-not-supported");
		}

		if (!element.name || !TsAST.isIdentifier(element.name)) {
			return context.error(element, "nested-destructuring-is-not-supported");
		}

		bindings.push(element);
	}

	const identifiers = collectIdentifiers(pattern.getSourceFile());
	const statements: GoAST.Statement[] = [];

	for (const [index, binding] of bindings.entries()) {
		const bindingName = binding.name;

		if (!bindingName || !TsAST.isIdentifier(bindingName)) {
			return context.error(binding, "nested-destructuring-is-not-supported");
		}

		const read = DEither.unwrapRight(
			await isRead(bindingName, identifiers, context),
		);

		if (DEither.isLeft(read)) {
			return read;
		}

		if (!read) {
			continue;
		}

		const element = GoAST.createIndexExpression({
			target: source,
			index: GoAST.createIntegerLiteral({ value: BigInt(index) }),
		});
		// ADR-14 : tuple hétérogène ([]UnionN) : l'élément est rétréci vers le type
		// de la variable à cette position (`[name, value]` : string, puis number).
		const bindingGoType = DEither.unwrapRight(await goTypeOf(
			await context.transpilation.typeChecker.getTypeAtLocation(bindingName),
			bindingName,
			context,
		));
		const elementGoType = sourceGoType.elementType as GoType;
		const narrowed = !DEither.isLeft(bindingGoType) && canNarrowUnion(elementGoType, bindingGoType.result)
			? narrowUnionExpression(element, elementGoType, bindingGoType.result, context)
			: undefined;

		statements.push(GoAST.createShortVariableDeclarationStatement({
			identifier: isTopLevelDeclarationName(bindingName)
				? context.createTopLevelIdentifier(context.file.currentFilePath, bindingName.text)
				: context.createSourceIdentifier(bindingName.text),
			initializer: narrowed && !DEither.isLeft(narrowed) ? DEither.unwrapRight(narrowed).result : element,
		}));
	}

	return DEither.right("bindings", statements);
}

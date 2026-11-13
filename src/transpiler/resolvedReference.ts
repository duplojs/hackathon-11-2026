import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import * as DPath from "@duplojs/lang/path";
import * as DString from "@duplojs/lang/string";
import { TsAST } from "@typescript";
import { Symbol, SymbolFlags } from "typescript/async";
import type { BuildContext } from "./context/build";

export type DependencyReference =
	| TsAST.Identifier
	| TsAST.QualifiedName
	| TsAST.PropertyAccessExpression
	| TsAST.ElementAccessExpression;

export type ModuleReference = DependencyReference | TsAST.ImportTypeNode | Symbol;

export interface ResolvedReference extends DModeling.ObjectTag<"ResolvedReference"> {
	readonly node: DependencyReference | undefined;
	readonly symbol: Symbol;
}

export interface DependencyFile extends ResolvedReference {
	readonly filePath: string & DPath.Absolute;
}

export interface ResolvedModuleReference extends ResolvedReference {
	readonly packageName: string;
	readonly entry: string;
	readonly exportName: string;
}

const createResolvedReference = DModeling.createTaggedObjectFactory<ResolvedReference>(
	"ResolvedReference",
);

async function resolveReferenceTarget(target: ModuleReference, context: BuildContext) {
	const { typeChecker: checker } = context.transpilation;
	const { sourceFile } = context.file;

	const symbol = await DCommon.justExec(async() => {
		if (target instanceof Symbol) {
			return target;
		}

		if (target.pos >= 0) {
			if (TsAST.isImportTypeNode(target)) {
				return (await checker.getTypeFromTypeNode(target)).getSymbol();
			}

			if (TsAST.isIdentifier(target) && TsAST.isShorthandPropertyAssignment(target.parent)) {
				return checker.getShorthandAssignmentValueSymbol(target.parent);
			}

			if (TsAST.isElementAccessExpression(target) && TsAST.isStringLiteral(target.argumentExpression)) {
				return checker.getSymbolAtLocation(target.argumentExpression);
			}

			return checker.getSymbolAtLocation(target);
		}

		if (TsAST.isIdentifier(target)) {
			return checker.resolveName(target.text, SymbolFlags.Type, sourceFile);
		}

		if (TsAST.isQualifiedName(target) && TsAST.isIdentifier(target.left)) {
			const namespace = await checker.resolveName(target.left.text, SymbolFlags.Namespace, sourceFile);
			const module = namespace && (namespace.flags & SymbolFlags.Alias
				? await checker.getAliasedSymbol(namespace)
				: namespace);
			return module && checker.getMemberInModuleExports(module, target.right.text);
		}

		if (
			TsAST.isImportTypeNode(target) && !target.isTypeOf
			&& target.qualifier && TsAST.isIdentifier(target.qualifier)
			&& TsAST.isLiteralTypeNode(target.argument) && TsAST.isStringLiteral(target.argument.literal)
		) {
			const path = target.argument.literal.text;
			const specifier = DArray.find(
				sourceFile.imports,
				(node) => TsAST.isStringLiteral(node) && node.text === path,
			);
			const module = specifier && await checker.getSymbolAtLocation(specifier);
			return module && checker.getMemberInModuleExports(module, target.qualifier.text);
		}

		return undefined;
	});

	if (!symbol) {
		return DEither.none();
	}

	const resolved = symbol.flags & SymbolFlags.Alias
		? await checker.getAliasedSymbol(symbol)
		: symbol;

	if (await checker.isUnknownSymbol(resolved)) {
		return DEither.none();
	}

	return DEither.some(createResolvedReference({
		node: !(target instanceof Symbol) && target.pos >= 0 && !TsAST.isImportTypeNode(target)
			? target
			: undefined,
		symbol: resolved,
	}));
}

export async function resolveDependencyFile(
	target: DependencyReference | Symbol,
	context: BuildContext,
) {
	const reference = await DCommon.asyncPipe(
		resolveReferenceTarget(target, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(reference)) {
		return reference;
	}

	const declaration = reference.symbol.valueDeclaration;
	if (!declaration) {
		return DEither.none();
	}

	const filePath = DEither.unwrapRight(DPath.createAbsolute(declaration.path));
	if (
		DEither.isLeft(filePath)
		|| filePath === context.file.currentFilePath
		|| DString.includes(filePath, "/node_modules/")
	) {
		return DEither.none();
	}

	const { projectWorkDirectory } = context.transpilation;
	const relativePath = DPath.computeRelative(projectWorkDirectory, filePath);

	if (!DPath.resolveFrom(projectWorkDirectory, [relativePath], { stayInOrigin: true })) {
		return DEither.none();
	}

	return DEither.some({
		...reference,
		filePath,
	});
}

export async function resolveReferenceModule(
	target: ModuleReference,
	context: BuildContext,
	moduleName: string,
	entryPattern?: RegExp,
) {
	const reference = await DCommon.asyncPipe(
		resolveReferenceTarget(target, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(reference)) {
		return reference;
	}

	const { symbol } = reference;

	const declaration = symbol.valueDeclaration ?? DArray.first(symbol.declarations);

	const match = declaration && DString.extract(
		declaration.path,
		/.*\/node_modules\/(?<packageName>@[^/]+\/[^/]+|[^/]+)\/(?<entry>.+)$/,
	);
	const { packageName, entry } = match?.namedGroups ?? {};

	if (
		!packageName
		|| !entry
		|| packageName !== moduleName
		|| (
			entryPattern !== undefined
			&& DString.search(entry, entryPattern) === undefined
		)
	) {
		return DEither.none();
	}

	return DEither.some({
		...reference,
		packageName,
		entry,
		exportName: symbol.name,
	});
}

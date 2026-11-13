import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import * as DPath from "@duplojs/lang/path";
import * as DString from "@duplojs/lang/string";
import { TsAST } from "@typescript";
import { Symbol, SymbolFlags, type Checker } from "typescript/async";

export type DependencyReference =
	| TsAST.Identifier
	| TsAST.QualifiedName
	| TsAST.PropertyAccessExpression
	| TsAST.ElementAccessExpression;

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

async function resolveReferenceTarget(target: DependencyReference | Symbol, checker: Checker) {
	const symbol = target instanceof Symbol
		? target
		: await (TsAST.isIdentifier(target) && TsAST.isShorthandPropertyAssignment(target.parent)
			? checker.getShorthandAssignmentValueSymbol(target.parent)
			: checker.getSymbolAtLocation(
				TsAST.isElementAccessExpression(target) && TsAST.isStringLiteral(target.argumentExpression)
					? target.argumentExpression
					: target,
			));

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
		node: target instanceof Symbol ? undefined : target,
		symbol: resolved,
	}));
}

export async function resolveDependencyFile(
	target: DependencyReference | Symbol,
	checker: Checker,
	projectWorkDirectory: string & DPath.Absolute,
	currentFilePath: string & DPath.Absolute,
) {
	const reference = await DCommon.asyncPipe(
		resolveReferenceTarget(target, checker),
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
		|| filePath === currentFilePath
		|| DString.includes(filePath, "/node_modules/")
	) {
		return DEither.none();
	}

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
	target: DependencyReference | Symbol,
	checker: Checker,
	moduleName: string,
	entryPattern?: RegExp,
) {
	const reference = await DCommon.asyncPipe(
		resolveReferenceTarget(target, checker),
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

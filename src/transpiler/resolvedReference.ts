import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import * as DPath from "@duplojs/lang/path";
import * as DString from "@duplojs/lang/string";
import * as TS from "typescript/ast";
import { Symbol, SymbolFlags, type Checker } from "typescript/async";

export type DependencyReference =
	| TS.Identifier
	| TS.QualifiedName
	| TS.PropertyAccessExpression
	| TS.ElementAccessExpression;

export interface ResolvedReference extends DModeling.ObjectTag<"ResolvedReference"> {
	readonly node: DependencyReference | undefined;
	readonly symbol: Symbol;
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
		: await (TS.isIdentifier(target) && TS.isShorthandPropertyAssignment(target.parent)
			? checker.getShorthandAssignmentValueSymbol(target.parent)
			: checker.getSymbolAtLocation(
				TS.isElementAccessExpression(target) && TS.isStringLiteral(target.argumentExpression)
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

export async function resolveReference(
	target: DependencyReference | Symbol,
	checker: Checker,
	projectWorkDirectory: string & DPath.Absolute,
) {
	const reference = DEither.unwrapRight(await resolveReferenceTarget(target, checker));
	if (DEither.isLeft(reference)) {
		return reference;
	}
	const { symbol } = reference;
	const declaration = symbol.valueDeclaration ?? DArray.first(symbol.declarations);
	if (!declaration || !DPath.isAbsolute(declaration.path) || DString.includes(declaration.path, "/node_modules/")) {
		return DEither.none();
	}
	const relativePath = DPath.computeRelative(projectWorkDirectory, declaration.path);
	return DPath.resolveFrom(projectWorkDirectory, [relativePath], { stayInOrigin: true })
		? DEither.some(reference)
		: DEither.none();
}

export async function resolveReferenceModule(
	target: DependencyReference | Symbol,
	checker: Checker,
	moduleName: string,
	entryPattern?: RegExp,
) {
	const reference = DEither.unwrapRight(await resolveReferenceTarget(target, checker));
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
	if (!packageName || !entry || packageName !== moduleName
		|| (entryPattern !== undefined && DString.search(entry, entryPattern) === undefined)) {
		return DEither.none();
	}
	return DEither.some({
		...reference,
		packageName,
		entry,
		exportName: symbol.name,
	});
}

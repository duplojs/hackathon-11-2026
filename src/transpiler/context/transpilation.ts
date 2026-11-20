import type { Checker } from "typescript/async";
import type { SharedDependency } from "@transformer";
import type * as DPath from "@duplojs/lang/path";
import type { ModuleGraph } from "../moduleGraph";
import type { TsAST } from "@typescript";

export interface TranspilationContext {
	readonly typeChecker: Checker;
	readonly projectWorkDirectory: string & DPath.Absolute;
	readonly sharedDependencies: Set<SharedDependency>;
	readonly moduleGraph: ModuleGraph;

	/** Cache des traductions de types (clé : id du type TS et fichier du site). */
	readonly typeCache: Map<string, unknown>;

	/**
	 * Substitutions des paramètres de type en cours (alias ou interface
	 * générique développé) : la portée la plus interne en dernier.
	 */
	typeParameterScopes: readonly ReadonlyMap<string, TsAST.TypeNode>[];
	increment(): number;
}

export interface CreateTranspilationContextParams {
	typeChecker: Checker;
	projectWorkDirectory: string & DPath.Absolute;
	moduleGraph: ModuleGraph;
}

export function createTranspilationContext(
	params: CreateTranspilationContextParams,
) {
	let index = 0;

	const context: TranspilationContext = {
		typeChecker: params.typeChecker,
		projectWorkDirectory: params.projectWorkDirectory,
		sharedDependencies: new Set(),
		moduleGraph: params.moduleGraph,
		typeCache: new Map(),
		typeParameterScopes: [],
		increment() {
			index += 1;

			return index;
		},
	};

	return context;
}

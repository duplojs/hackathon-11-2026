import type { Checker } from "typescript/async";
import type { SharedDependency } from "@transformer";
import type * as DPath from "@duplojs/lang/path";

export interface TranspilationContext {
	readonly typeChecker: Checker;
	readonly projectWorkDirectory: string & DPath.Absolute;
	readonly sharedDependencies: Set<SharedDependency>;
	// Numéro suivant pour un nom donné : `left1`, `left2`… Chaque nom a son propre compteur,
	// ce qui garde des noms courts tout en garantissant leur unicité dans le programme.
	nextIndexOf(name: string): number;
}

export interface CreateTranspilationContextParams {
	typeChecker: Checker;
	projectWorkDirectory: string & DPath.Absolute;
}

export function createTranspilationContext(
	params: CreateTranspilationContextParams,
) {
	const indexes = new Map<string, number>();

	const context: TranspilationContext = {
		typeChecker: params.typeChecker,
		projectWorkDirectory: params.projectWorkDirectory,
		sharedDependencies: new Set(),
		nextIndexOf(name) {
			const index = (indexes.get(name) ?? 0) + 1;
			indexes.set(name, index);

			return index;
		},
	};

	return context;
}

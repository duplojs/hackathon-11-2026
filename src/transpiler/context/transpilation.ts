import type { Checker } from "typescript/async";
import type { SharedDependency } from "../sharedDependency";

export interface Dependencies {
	readonly dependencies: ReadonlySet<SharedDependency>;
	push(sharedDependency: SharedDependency): void;
}

export interface TranspilationContext {
	readonly typeChecker: Checker;
	readonly sharedDependencies: Dependencies;
	increment(): number;
}

function createDependencies() {
	const dependencies = new Set<SharedDependency>();

	return {
		dependencies,
		push(sharedDependency: SharedDependency) {
			dependencies.add(sharedDependency);
		},
	};
}

export function createTranspilationContext(typeChecker: Checker) {
	let index = 0;

	const context: TranspilationContext = {
		typeChecker,
		sharedDependencies: createDependencies(),
		increment() {
			index += 1;

			return index;
		},
	};

	return context;
}

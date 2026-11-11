import type { Checker } from "typescript/async";
import type { SharedDependency } from "../sharedDependency";
import type * as DPath from "@duplojs/lang/path";

export interface TranspilationContext {
	readonly typeChecker: Checker;
	readonly projectWorkDirectory: string & DPath.Absolute;
	readonly sharedDependencies: Set<SharedDependency>;
	increment(): number;
}

export interface CreateTranspilationContextParams {
	typeChecker: Checker;
	projectWorkDirectory: string & DPath.Absolute;
}

export function createTranspilationContext(
	params: CreateTranspilationContextParams,
) {
	let index = 0;

	const context: TranspilationContext = {
		typeChecker: params.typeChecker,
		projectWorkDirectory: params.projectWorkDirectory,
		sharedDependencies: new Set(),
		increment() {
			index += 1;

			return index;
		},
	};

	return context;
}

import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import type * as DPath from "@duplojs/lang/path";
import * as DString from "@duplojs/lang/string";
import type { Checker, Program } from "typescript/async";
import { toDPathAbsolute, toNativePath } from "./path";

/**
 * Graphe des modules du projet (fichiers sources hors node_modules), calculé
 * AVANT la transpilation.
 *
 * Go interdit les imports circulaires entre packages, alors que les modules ES
 * les autorisent. Les fichiers d'une même composante fortement connexe (cycle
 * d'imports) sont donc émis dans UN SEUL package Go. Un fichier hors cycle
 * garde son propre package : un projet sans cycle produit exactement le même Go.
 */
export interface ModuleGraph {

	/** Fichier -> fichier représentant de son package (lui-même hors cycle). */
	readonly packageOf: ReadonlyMap<string, string & DPath.Absolute>;

	/** Représentant -> fichiers du package, dans l'ordre d'évaluation ES. */
	readonly packageMembers: ReadonlyMap<string, readonly (string & DPath.Absolute)[]>;
}

export function isMergedPackage(graph: ModuleGraph, filePath: string) {
	const representative = graph.packageOf.get(filePath);
	const members = representative && graph.packageMembers.get(representative);

	return members !== undefined && members.length > 1;
}

async function getImportedProjectFiles(
	program: Program,
	checker: Checker,
	filePath: string & DPath.Absolute,
	projectWorkDirectory: string & DPath.Absolute,
) {
	const sourceFile = await program.getSourceFile(toNativePath(filePath));

	if (!sourceFile) {
		return [];
	}

	const imported: (string & DPath.Absolute)[] = [];

	for (const specifier of sourceFile.imports) {
		const moduleSymbol = await checker.getSymbolAtLocation(specifier);
		const declaration = moduleSymbol?.valueDeclaration ?? DArray.first(moduleSymbol?.declarations ?? []);
		const importedPath = declaration && DEither.unwrapRight(toDPathAbsolute(declaration.path));

		if (
			!importedPath
			|| DEither.isLeft(importedPath)
			|| DString.includes(importedPath, "/node_modules/")
			|| !DString.startsWith(importedPath, `${projectWorkDirectory}/`)
			|| importedPath === filePath
			|| imported.includes(importedPath)
		) {
			continue;
		}

		imported.push(importedPath);
	}

	return imported;
}

export async function createModuleGraph(params: {
	program: Program;
	checker: Checker;
	entry: string & DPath.Absolute;
	projectWorkDirectory: string & DPath.Absolute;
}): Promise<ModuleGraph> {
	const edges = new Map<string, readonly (string & DPath.Absolute)[]>();
	const pending: (string & DPath.Absolute)[] = [params.entry];

	while (pending.length > 0) {
		const filePath = pending.pop()!;

		if (edges.has(filePath)) {
			continue;
		}

		const imported = await getImportedProjectFiles(
			params.program,
			params.checker,
			filePath,
			params.projectWorkDirectory,
		);

		edges.set(filePath, imported);
		pending.push(...imported);
	}

	// Ordre d'évaluation ES : parcours en profondeur, dépendances d'abord, dans
	// l'ordre des imports ; un module déjà en cours (cycle) n'est pas revisité.
	const evaluationOrder: (string & DPath.Absolute)[] = [];
	const visited = new Set<string>();
	const visit = (filePath: string & DPath.Absolute) => {
		if (visited.has(filePath)) {
			return;
		}

		visited.add(filePath);
		for (const imported of edges.get(filePath) ?? []) {
			visit(imported);
		}
		evaluationOrder.push(filePath);
	};
	visit(params.entry);

	// Composantes fortement connexes (Tarjan).
	const indexOf = new Map<string, number>();
	const lowLink = new Map<string, number>();
	const stack: (string & DPath.Absolute)[] = [];
	const onStack = new Set<string>();
	const components: (string & DPath.Absolute)[][] = [];
	let nextIndex = 0;

	const connect = (filePath: string & DPath.Absolute) => {
		indexOf.set(filePath, nextIndex);
		lowLink.set(filePath, nextIndex);
		nextIndex += 1;
		stack.push(filePath);
		onStack.add(filePath);

		for (const imported of edges.get(filePath) ?? []) {
			if (!indexOf.has(imported)) {
				connect(imported);
				lowLink.set(filePath, Math.min(lowLink.get(filePath)!, lowLink.get(imported)!));
			} else if (onStack.has(imported)) {
				lowLink.set(filePath, Math.min(lowLink.get(filePath)!, indexOf.get(imported)!));
			}
		}

		if (lowLink.get(filePath) === indexOf.get(filePath)) {
			const component: (string & DPath.Absolute)[] = [];
			let member: (string & DPath.Absolute) | undefined = undefined;

			do {
				member = stack.pop()!;
				onStack.delete(member);
				component.push(member);
			} while (member !== filePath);

			components.push(component);
		}
	};

	for (const filePath of edges.keys()) {
		if (!indexOf.has(filePath)) {
			connect(filePath as string & DPath.Absolute);
		}
	}

	const packageOf = new Map<string, string & DPath.Absolute>();
	const packageMembers = new Map<string, readonly (string & DPath.Absolute)[]>();

	for (const component of components) {
		const members = DArray.filter(evaluationOrder, (filePath) => component.includes(filePath));
		// Représentant stable : le premier fichier dans l'ordre alphabétique.
		const representative = [...component].sort()[0]!;

		packageMembers.set(representative, members);
		for (const member of component) {
			packageOf.set(member, representative);
		}
	}

	return {
		packageOf,
		packageMembers,
	};
}

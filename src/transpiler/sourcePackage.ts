import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPath from "@duplojs/lang/path";
import * as DString from "@duplojs/lang/string";
import { isMergedPackage, type ModuleGraph } from "./moduleGraph";

export const goModulePath = "duplojs.local/transpiled";
export const goModuleContent = `module ${goModulePath}\n\ngo 1.27.4\n`;

export function createSourcePackageLayout(
	projectWorkDirectory: string & DPath.Absolute,
	sourcePath: string & DPath.Absolute,
) {
	const relativePath = DPath.computeRelative(projectWorkDirectory, sourcePath);
	const baseName = DPath.getBaseName(sourcePath);
	const containedPath = DPath.resolveFrom(projectWorkDirectory, [relativePath], { stayInOrigin: true });

	if (!baseName || relativePath === "." || !containedPath) {
		return DEither.left("invalid-source-package-path", sourcePath);
	}

	return DEither.rightPipe(
		DPath.create(`${relativePath}/${baseName}.go`),
		(outputPath) => DEither.success({
			importPath: `${goModulePath}/${relativePath}`,
			packageDirectory: relativePath,
			outputPath,
		}),
	);
}

/** Clé d'un fichier, utilisable dans un identifiant ou un nom de fichier Go. */
export function createFileKey(
	projectWorkDirectory: string & DPath.Absolute,
	filePath: string & DPath.Absolute,
) {
	return DCommon.pipe(
		DPath.computeRelative(projectWorkDirectory, filePath),
		DString.replace(/\.tsx?$/, ""),
		DString.replace(/[^a-zA-Z0-9]/g, "_"),
	);
}

/**
 * Package Go d'un fichier source. Hors cycle : son propre package (inchangé).
 * Dans un cycle d'imports : le package du représentant de la composante, un
 * fichier Go par fichier source (Go exige un seul dossier par package).
 */
export function createFilePackageLayout(
	projectWorkDirectory: string & DPath.Absolute,
	moduleGraph: ModuleGraph,
	filePath: string & DPath.Absolute,
) {
	const representative = moduleGraph.packageOf.get(filePath) ?? filePath;

	if (!isMergedPackage(moduleGraph, filePath)) {
		return createSourcePackageLayout(projectWorkDirectory, filePath);
	}

	return DEither.rightPipe(
		createSourcePackageLayout(projectWorkDirectory, representative),
		(layout) => DEither.rightPipe(
			DPath.create(`${layout.packageDirectory}/${createFileKey(projectWorkDirectory, filePath)}.go`),
			(outputPath) => DEither.success({
				...layout,
				outputPath,
			}),
		),
	);
}

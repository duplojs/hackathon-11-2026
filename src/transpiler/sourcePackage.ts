import * as DEither from "@duplojs/lang/either";
import * as DPath from "@duplojs/lang/path";

export const goModulePath = "duplojs.local/transpiled";
export const goModuleContent = `module ${goModulePath}\n\ngo 1.18\n`;

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
			outputPath,
		}),
	);
}

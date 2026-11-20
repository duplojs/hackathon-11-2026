import { API } from "typescript/async";
import * as DPath from "@duplojs/lang/path";
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DInvocation from "@duplojs/lang/invocation";
import { absoluteFromTypescriptPath, toTypescriptPath } from "./typescriptPath";

export interface CreateTypescriptInstanceParams {
	tsconfigPath: string & DPath.Absolute;
}

export async function createTypescriptInstance(
	params: CreateTypescriptInstanceParams,
) {
	const tsconfigDirectory = DPath.getParentFolderPath(params.tsconfigPath);

	if (!tsconfigDirectory) {
		return DEither.left("invalidTsconfigPath");
	}

	const api = new API({
		cwd: toTypescriptPath(tsconfigDirectory),
	});

	const tsconfigPath = toTypescriptPath(params.tsconfigPath);
	const snapshot = await api.createSnapshot({
		openProjects: [tsconfigPath],
	});

	const project = snapshot.getConfiguredProject(tsconfigPath);

	if (!project) {
		await api.close();
		return DEither.left("missingProject");
	}

	const projectWorkDirectory = DCommon.pipe(
		api.getCurrentDirectory(),
		(directory) => api.getCanonicalFileName(directory),
		absoluteFromTypescriptPath,
		DEither.unwrapRight,
	);

	if (DEither.isLeft(projectWorkDirectory)) {
		await api.close();
		return projectWorkDirectory;
	}

	return DCommon.pipe(
		{
			snapshot,
			api,
			project,
			projectWorkDirectory,
			tsconfigPath: params.tsconfigPath,
		},
		DInvocation.appendEvidence("typescript-instance"),
		DEither.success,
	);
}

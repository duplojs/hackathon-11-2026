import { API } from "typescript/async";
import * as DPath from "@duplojs/lang/path";
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DInvocation from "@duplojs/lang/invocation";

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
		cwd: tsconfigDirectory,
	});

	const snapshot = await api.createSnapshot({
		openProjects: [params.tsconfigPath],
	});

	const project = snapshot.getConfiguredProject(params.tsconfigPath);

	if (!project) {
		await api.close();
		return DEither.left("missingProject");
	}

	const projectWorkDirectory = DCommon.pipe(
		api.getCurrentDirectory(),
		(directory) => api.getCanonicalFileName(directory),
		DPath.createAbsolute,
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

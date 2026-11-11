import * as DSDataStructure from "@duplojs/server/dataStructure";
import * as DSCommand from "@duplojs/server/command";
import * as DPath from "@duplojs/lang/path";
import * as DSCommon from "@duplojs/server/common";
import { build, createTypescriptInstance } from "@transpiler";
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DGenerator from "@duplojs/lang/generator";
import * as DSFile from "@duplojs/server/file";

await DSCommand.exec(
	{
		options: [
			DSCommand.createOption(
				"tsconfig",
				DSDataStructure.file([
					DSDataStructure.fileExist(),
					DSDataStructure.mimeType("application/json"),
				]),
				{ required: true },
			),
			DSCommand.createOption(
				"input",
				DSDataStructure.file([DSDataStructure.fileExist()]),
				{ required: true },
			),
			DSCommand.createOption(
				"output",
				DSDataStructure.folder(),
				{ required: true },
			),
		],
	},
	async({ options }) => {
		const workDirectory = DSCommon.getCurrentWorkDirectoryOrThrow();
		const resolvedTsconfig = DPath.resolveFrom(
			workDirectory,
			[options.tsconfig.path],
		);
		const input = DPath.resolveFrom(workDirectory, [options.input.path]);
		const output = DPath.resolveFrom(workDirectory, [options.output.path]);

		await DSFile.remove(output, { recursive: true });

		const result = await DEither.rightAsyncPipe(
			createTypescriptInstance({
				tsconfigPath: resolvedTsconfig,
			}),
			async(typescriptInstance) => DCommon.asyncPipe(
				build(typescriptInstance, input),
				DGenerator.asyncReduce(
					DGenerator.reduceFrom(DEither.ok()),
					async({ item, next, exit }) => {
						if (DEither.isLeft(item)) {
							return exit(item);
						}

						const transformed = DEither.unwrapRight(item);
						const outputPath = transformed.outputPath;
						const destination = DPath.resolveFrom(output, [outputPath], { stayInOrigin: true });
						const parent = destination && DPath.getParentFolderPath(destination);

						if (!destination || !parent) {
							return exit(DEither.left("invalid-output-path", outputPath));
						}

						const written = await DEither.rightAsyncPipe(
							DSFile.ensureDirectory(parent),
							() => DSFile.writeTextFile(destination, transformed.content),
						);

						return DEither.isLeft(written) ? exit(written) : next(DEither.ok());
					},
				),
				DCommon.tap(() => typescriptInstance.api.close()),
			),
		);

		void DEither.unwrapRightOrThrow(result);
	},
);

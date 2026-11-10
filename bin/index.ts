import * as DSDataStructure from "@duplojs/server/dataStructure";
import * as DSCommand from "@duplojs/server/command";
import * as DPath from "@duplojs/lang/path";
import * as DSCommon from "@duplojs/server/common";
import { createTypescriptInstance } from "@transpiler";
import * as DEither from "@duplojs/lang/either";

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
		const resolvedTsconfig = DPath.resolveFrom(
			DSCommon.getCurrentWorkDirectoryOrThrow(),
			[options.tsconfig.path],
		);

		const result = await DEither.rightAsyncPipe(
			createTypescriptInstance({
				tsconfigPath: resolvedTsconfig,
			}),
			(typescriptInstance) => {

			},
		);

		void DEither.unwrapRightOrThrow(result);
	},
);

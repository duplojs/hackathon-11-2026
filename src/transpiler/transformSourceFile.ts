import * as GO from "@go";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import * as DModeling from "@duplojs/lang/modeling";
import { type SourceFile } from "typescript/ast";
import type { TransformerContext } from "./context";
import type { LocalTransformerContext } from "./localContext";
import { sourceFileTransformers } from "./transformers";
import * as DPath from "@duplojs/lang/path";

interface TransformedFileContent {
	imports: GO.AST.GoFile["imports"];
	declarations: GO.AST.GoFile["declarations"];
	init: GO.AST.GoFile["init"];
}

export async function transformSourceFile(
	sourceFile: SourceFile,
	context: TransformerContext,
) {
	const localContext: LocalTransformerContext = { sourceFile };

	const content = await DCommon.asyncPipe(
		sourceFile.statements,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<TransformedFileContent>({
				imports: [],
				declarations: [],
				init: [],
			}),
			async({ item, lastValue, next, exit }) => {
				const statement = await DCommon.asyncPipe(
					context.transform(item, sourceFileTransformers.value, localContext),
					DEither.keepAsRightByInformation("transformation-success"),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(statement)) {
					return exit(statement);
				}

				const result = statement.result;
				const declarations = [...lastValue.declarations, ...statement.topLevelDeclarations];
				const init = [...lastValue.init, ...statement.before];

				if (DModeling.hasTagValue(result, "node-declaration-function")) {
					return next({
						imports: lastValue.imports,
						declarations: DArray.push(declarations, result),
						init,
					});
				}

				return next({
					imports: lastValue.imports,
					declarations,
					init: DArray.push(init, result),
				});
			},
		),
	);

	if (DEither.isLeft(content)) {
		return content;
	}

	const packageNameResult = DEither.rightPipe(
		sourceFile.fileName,
		DPath.normalize,
		DEither.toMaybe,
		(value) => DPath.getBaseName(value, { removeExtension: true }),
		DEither.toMaybe,
	);

	if (DEither.isLeft(packageNameResult)) {
		return DEither.left("invalid-package-name", sourceFile);
	}

	const packageName = context.createSourceIdentifier(DEither.unwrapRight(packageNameResult));

	return DEither.success(
		GO.AST.goFile({
			packageName,
			...content,
		}),
	);
}

import * as DArray from "@duplojs/lang/array";
import { GoAST } from "@go";

export interface CreateFileParams {
	packageName: GoAST.Identifier;
	imports: readonly GoAST.ImportDeclaration[];
	declarations: readonly GoAST.Declaration[];
	init: readonly GoAST.Statement[];
}

export function createFile(params: CreateFileParams) {
	const declarations = DArray.push(
		params.declarations,
		GoAST.functionDeclaration({
			identifier: GoAST.createIdentifier("init"),
			generic: [],
			returnTypes: [],
			parameters: [],
			body: GoAST.blockStatement({
				statements: params.init,
			}),
		}),
	);

	return GoAST.goFile({
		packageName: params.packageName,
		imports: params.imports,
		declarations,
	});
}

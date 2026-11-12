import * as DArray from "@duplojs/lang/array";
import * as GO from "@go";

export interface CreateFileParams {
	packageName: GO.AST.Identifier;
	imports: readonly GO.AST.ImportDeclaration[];
	declarations: readonly GO.AST.Declaration[];
	init: readonly GO.AST.Statement[];
}

export function createFile(params: CreateFileParams) {
	const declarations = DArray.push(
		params.declarations,
		GO.AST.functionDeclaration({
			identifier: GO.AST.createIdentifier("init"),
			generic: [],
			returnTypes: [],
			parameters: [],
			body: GO.AST.blockStatement({
				statements: params.init,
			}),
		}),
	);

	return GO.AST.goFile({
		packageName: params.packageName,
		imports: params.imports,
		declarations,
	});
}

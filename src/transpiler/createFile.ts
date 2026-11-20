import * as DArray from "@duplojs/lang/array";
import { GoAST } from "@go";

export interface CreateFileParams {
	packageName: GoAST.Identifier;
	imports: readonly GoAST.ImportDeclaration[];
	declarations: readonly GoAST.Declaration[];
	init: readonly GoAST.Statement[];

	/** Nom de la fonction d'initialisation (`init` par défaut). */
	initIdentifier?: GoAST.Identifier;
}

export function createFile(params: CreateFileParams) {
	const declarations = DArray.lengthEqual(params.init, 0)
		? params.declarations
		: DArray.push(
			params.declarations,
			GoAST.createFunctionDeclaration({
				identifier: params.initIdentifier ?? GoAST.createIdentifier("init"),
				generic: [],
				returnTypes: [],
				arguments: [],
				body: GoAST.createBlockStatement({
					statements: params.init,
				}),
			}),
		);

	return GoAST.createGoFile({
		packageName: params.packageName,
		imports: params.imports,
		declarations,
	});
}

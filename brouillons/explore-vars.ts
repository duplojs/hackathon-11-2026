// Exploration : types TS des variables de haut niveau de chaque exercice (pour la répartition)
import { createTypescriptInstance } from "@transpiler";
import { TsAST } from "@typescript";
import * as DPath from "@duplojs/lang/path";
import * as DEither from "@duplojs/lang/either";

for (const n of (process.argv[2] ?? "02,04,05,06,07,08,09,10").split(",")) {
	const tsconfig = DEither.unwrapRightOrThrow(DPath.createAbsolute(`${process.cwd()}/${n.includes("/") ? n : `projects/${n}`}/tsconfig.json`));
	const instance = DEither.unwrapRightOrThrow(await createTypescriptInstance({ tsconfigPath: tsconfig }));
	const checker = instance.project.checker as any;
	console.log(`===== ${n}`);
	for (const file of ["add.ts", "index.ts"]) {
		const sourceFile = (await instance.project.program.getSourceFile(`${process.cwd()}/${n.includes("/") ? n : `projects/${n}`}/${file}`))!;
		for (const statement of sourceFile.statements) {
			if (TsAST.isVariableStatement(statement)) {
				for (const declaration of statement.declarationList.declarations) {
					const type = await checker.getTypeAtLocation(declaration.name);
					console.log(`${declaration.name.getText()} : ${await checker.typeToString(type)}`);
				}
			}
			if (TsAST.isFunctionDeclaration(statement)) {
				const signature = await checker.getSignatureFromDeclaration(statement);
				const returnType = await checker.getReturnTypeOfSignature(signature);
				console.log(`${statement.name?.getText()}() : ${await checker.typeToString(returnType)}`);
			}
		}
	}
	await instance.api.close();
}

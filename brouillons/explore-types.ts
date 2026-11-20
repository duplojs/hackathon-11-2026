// Exploration : que renvoie le checker TS 7 pour les types Either des exercices ?
import { createTypescriptInstance } from "@transpiler";
import { TsAST } from "@typescript";
import * as DPath from "@duplojs/lang/path";
import * as DEither from "@duplojs/lang/either";

function dump(node: TsAST.Node | undefined, depth = 0): string {
	if (!node) return "undefined";
	const pad = "  ".repeat(depth);
	let label = TsAST.SyntaxKind[node.kind];
	if (TsAST.isIdentifier(node)) label += ` "${node.text}"`;
	if (TsAST.isStringLiteral(node)) label += ` '${node.text}'`;
	const children: string[] = [];
	node.forEachChild((child) => { children.push(dump(child, depth + 1)); });
	return `${pad}${label} pos=${node.pos}` + (children.length ? "\n" + children.join("\n") : "");
}

for (const n of ["00", "01", "04"]) {
	const tsconfig = DEither.unwrapRightOrThrow(DPath.createAbsolute(`${process.cwd()}/projects/${n}/tsconfig.json`));
	const instance = DEither.unwrapRightOrThrow(await createTypescriptInstance({ tsconfigPath: tsconfig }));
	const checker = instance.project.checker;
	const sourceFile = (await instance.project.program.getSourceFile(`${process.cwd()}/projects/${n}/add.ts`))!;
	const fn = sourceFile.statements.find(TsAST.isFunctionDeclaration)!;
	const signature = await checker.getSignatureFromDeclaration(fn);
	const returnType = await checker.getReturnTypeOfSignature(signature);
	console.log(`===== projet ${n} : type de retour de add =====`);
	console.log(dump(await checker.typeToTypeNode(returnType, fn)));
	const calls: TsAST.CallExpression[] = [];
	const visit = (node: TsAST.Node) => { if (TsAST.isReturnStatement(node) && node.expression && TsAST.isCallExpression(node.expression)) calls.push(node.expression); node.forEachChild(visit); };
	visit(fn);
	for (const call of calls) {
		console.log(`--- ${call.getText()} : type contextuel`);
		const contextual = await checker.getContextualType(call);
		console.log(contextual ? dump(await checker.typeToTypeNode(contextual, call)) : "aucun");
		console.log(`--- ${call.getText()} : type propre`);
		console.log(dump(await checker.typeToTypeNode(await checker.getTypeAtLocation(call), call)));
	}
	await instance.api.close();
}

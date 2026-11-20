import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { type BuildContext } from "../../context/build";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { TypeFlags } from "typescript/async";
import { expressionTransformers } from "../expression";
import { statementTransformers } from ".";

// Une branche est toujours rendue comme un bloc Go : les préparations (`before`) d'une
// instruction restent ainsi dans la branche et ne sont exécutées que si elle est choisie.
async function transformBranch(node: TsAST.Statement, context: BuildContext) {
	const branch = await DCommon.asyncPipe(
		context.transform(node, statementTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(branch)) {
		return branch;
	}

	if (
		DArray.lengthEqual(branch.before, 0)
		&& (
			DModeling.hasTagValue(branch.result, "[node][statement]block")
			|| DModeling.hasTagValue(branch.result, "[node][statement]if")
		)
	) {
		return DEither.success(branch.result);
	}

	return DEither.success(
		GoAST.createBlockStatement({
			statements: DArray.push(branch.before, branch.result),
		}),
	);
}

export const ifStatementTransformer: Transformer<GoAST.IfStatement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isIfStatement(node)) {
			return context.notSupport();
		}

		// La vérité d'une valeur non booléenne (nombre, chaîne, objet…) suit les règles JavaScript,
		// absentes de Go : seule une condition booléenne est traduite.
		const conditionType = await context.transpilation.typeChecker.getTypeAtLocation(node.expression);

		if (!(conditionType.flags & TypeFlags.BooleanLike)) {
			return context.error(node.expression, "non-boolean-condition-not-supported");
		}

		const condition = await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(condition)) {
			return condition;
		}

		const body = await transformBranch(node.thenStatement, context);

		if (DEither.isLeft(body)) {
			return body;
		}

		const thenBody = DEither.unwrapRight(body);

		const elseBranch = node.elseStatement
			? await transformBranch(node.elseStatement, context)
			: undefined;

		if (elseBranch && DEither.isLeft(elseBranch)) {
			return elseBranch;
		}

		return context.success({
			before: condition.before,
			result: GoAST.createIfStatement({
				condition: condition.result,
				body: DModeling.hasTagValue(thenBody, "[node][statement]block")
					? thenBody
					: GoAST.createBlockStatement({ statements: [thenBody] }),
				elseBranch: elseBranch && DEither.unwrapRight(elseBranch),
			}),
		});
	},
);

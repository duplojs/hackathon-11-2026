import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createTransformer, type NotfoundTransformer, type TransformationError, type TransformationNotSupported, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import type { BuildContext } from "../../context/build";
import { expressionTransformers } from "../expression";
import { blockStatementTransformer } from "./block";
import { statementTransformers } from ".";

type IfStatementTransformResult = Awaited<
	ReturnType<Transformer<GoAST.IfStatement>["transformer"]>
>;

export async function transformBranchToBlock(
	node: TsAST.Statement,
	context: BuildContext,
) {
	if (TsAST.isBlock(node)) {
		const block = await DCommon.asyncPipe(
			context.transform(node, [blockStatementTransformer]),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(block)) {
			return block;
		}

		return context.success({
			result: DArray.lengthEqual(block.before, 0)
				? block.result
				: GoAST.createBlockStatement({
					statements: DArray.concat(block.before, [block.result]),
				}),
		});
	}

	const statement = await DCommon.asyncPipe(
		context.transform(node, statementTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(statement)) {
		return statement;
	}

	return context.success({
		result: GoAST.createBlockStatement({
			statements: DArray.concat(statement.before, [statement.result]),
		}),
	});
}

// else absent : undefined ; else if : l'if imbriqué (ses `before` dans un bloc,
// pour que la condition ne soit évaluée que si la précédente est fausse) ; sinon un bloc.
async function transformElseBranch(
	node: TsAST.Statement | undefined,
	context: BuildContext,
): Promise<
	| DEither.Right<"else-branch", GoAST.BlockStatement | GoAST.IfStatement | undefined>
	| TransformationError
	| NotfoundTransformer
	| TransformationNotSupported
> {
	if (!node) {
		return DEither.right("else-branch", undefined);
	}

	if (TsAST.isIfStatement(node)) {
		const nestedIf = DEither.unwrapRight(await transformIfStatement(node, context));

		if (DEither.isLeft(nestedIf)) {
			return nestedIf;
		}

		return DEither.right(
			"else-branch",
			DArray.lengthEqual(nestedIf.before, 0)
				? nestedIf.result
				: GoAST.createBlockStatement({
					statements: DArray.concat(nestedIf.before, [nestedIf.result]),
				}),
		);
	}

	const elseBody = DEither.unwrapRight(await transformBranchToBlock(node, context));

	return DEither.isLeft(elseBody)
		? elseBody
		: DEither.right("else-branch", elseBody.result);
}

async function transformIfStatement(
	node: TsAST.IfStatement,
	context: BuildContext,
): Promise<IfStatementTransformResult> {
	const condition = await DCommon.asyncPipe(
		context.transform(node.expression, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(condition)) {
		return condition;
	}

	const body = await DCommon.asyncPipe(
		transformBranchToBlock(node.thenStatement, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(body)) {
		return body;
	}

	const elseBranch = await DCommon.asyncPipe(
		transformElseBranch(node.elseStatement, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(elseBranch)) {
		return elseBranch;
	}

	return context.success({
		before: condition.before,
		result: GoAST.createIfStatement({
			condition: condition.result,
			body: body.result,
			elseBranch,
		}),
	});
}

export const ifStatementTransformer: Transformer<GoAST.IfStatement> = createTransformer(
	(node, context) => {
		if (!TsAST.isIfStatement(node)) {
			return context.notSupport();
		}

		return transformIfStatement(node, context);
	},
);

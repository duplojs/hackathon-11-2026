import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../context/build";
import { expressionTransformers } from "../expression";
import { bindArrayPattern } from "../expression/bindArrayPattern";
import { goTypeOfExpression } from "../type/goTypeOf";
import { transformBranchToBlock } from "./if";
import { statementTransformers } from ".";

/**
 * Boucles (ADR-14). Go n'a que `for` :
 * - `for (const x of a)` : `for _, x := range a` ;
 * - `while (c)` : `for c { … }`, ou `for { before(c) ; if !c { break } … }` si la
 *   condition a des préparations (appel…), réévaluées à chaque tour ;
 * - `for (init; c; post)` : `for init; c; post { … }` (Go 1.22 : une variable par
 *   tour, comme `let` en JS) ; refusée si l'une des trois parties a des
 *   préparations, que `continue` sauterait ;
 * - `do { … } while (c)` : refusée si le corps contient `continue` (qui doit
 *   passer par la condition) ;
 * - `break` et `continue` sans étiquette : identiques.
 */

type ForParams = Parameters<typeof GoAST.createForStatement>[0];

function prependStatements(block: GoAST.BlockStatement, statements: readonly GoAST.Statement[]) {
	return GoAST.createBlockStatement({
		statements: DArray.concat(statements, block.statements),
	});
}

function negate(condition: GoAST.Expression) {
	return GoAST.createUnaryExpression({
		operator: "!",
		operand: condition,
	});
}

async function transformCondition(node: TsAST.Expression, context: BuildContext) {
	return DCommon.asyncPipe(
		context.transform(node, expressionTransformers.value),
		DEither.unwrapRight,
	);
}

function containsContinue(node: TsAST.Node): boolean {
	if (TsAST.isContinueStatement(node)) {
		return true;
	}

	// Une boucle imbriquée a son propre `continue`.
	if (
		TsAST.isForStatement(node)
		|| TsAST.isForOfStatement(node)
		|| TsAST.isForInStatement(node)
		|| TsAST.isWhileStatement(node)
		|| TsAST.isDoStatement(node)
	) {
		return false;
	}

	let found = false;
	node.forEachChild((child) => {
		found ||= containsContinue(child);
	});

	return found;
}

/** La variable de boucle est-elle lue dans le corps (Go refuse une variable inutilisée) ? */
async function isReadInBody(name: TsAST.Identifier, body: TsAST.Node, context: BuildContext) {
	const { typeChecker } = context.transpilation;
	const symbol = await typeChecker.getSymbolAtLocation(name);
	const candidates: TsAST.Identifier[] = [];
	const visit = (node: TsAST.Node) => {
		if (TsAST.isIdentifier(node) && node.text === name.text) {
			candidates.push(node);
		}

		node.forEachChild(visit);
	};

	visit(body);

	for (const candidate of candidates) {
		if ((await typeChecker.getSymbolAtLocation(candidate))?.id === symbol?.id) {
			return true;
		}
	}

	return false;
}

export const forOfStatementTransformer: Transformer<GoAST.Statement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isForOfStatement(node)) {
			return context.notSupport();
		}

		if (node.awaitModifier) {
			return context.error(node, "for-await-not-supported");
		}

		const declaration = TsAST.isVariableDeclarationList(node.initializer)
			? DArray.first(node.initializer.declarations)
			: undefined;

		if (
			!declaration
			|| !TsAST.isVariableDeclarationList(node.initializer)
			|| node.initializer.declarations.length !== 1
		) {
			return context.error(node.initializer, "for-of-binding-not-supported");
		}

		const iterableGoType = DEither.unwrapRight(await goTypeOfExpression(node.expression, context));

		if (DEither.isLeft(iterableGoType) || !DModeling.hasTagValue(iterableGoType.result, "[node][type]slice")) {
			return context.error(node.expression, "for-of-only-supports-arrays");
		}

		const iterable = await transformCondition(node.expression, context);

		if (DEither.isLeft(iterable)) {
			return iterable;
		}

		const body = DEither.unwrapRight(await transformBranchToBlock(node.statement, context));

		if (DEither.isLeft(body)) {
			return body;
		}

		const iterableIdentifier = context.generateIdentifier();
		let valueIdentifier: GoAST.Identifier = GoAST.createIdentifier("_");
		let bodyBlock = body.result;

		if (TsAST.isIdentifier(declaration.name)) {
			if (await isReadInBody(declaration.name, node.statement, context)) {
				valueIdentifier = context.createSourceIdentifier(declaration.name.text);
			}
		} else if (TsAST.isArrayBindingPattern(declaration.name)) {
			valueIdentifier = context.generateIdentifier();
			const bindings = DEither.unwrapRight(await bindArrayPattern({
				pattern: declaration.name,
				source: valueIdentifier,
				sourceGoType: iterableGoType.result.elementType as Parameters<typeof bindArrayPattern>[0]["sourceGoType"],
				context,
			}));

			if (DEither.isLeft(bindings)) {
				return bindings;
			}

			if (DArray.lengthEqual(bindings, 0)) {
				valueIdentifier = GoAST.createIdentifier("_");
			}

			bodyBlock = prependStatements(bodyBlock, bindings);
		} else {
			return context.error(declaration.name, "for-of-binding-not-supported");
		}

		return context.success({
			before: DArray.concat(iterable.before, [
				GoAST.createShortVariableDeclarationStatement({
					identifier: iterableIdentifier,
					initializer: iterable.result,
				}),
			]),
			result: GoAST.createRangeStatement({
				binding: GoAST.createRangeDeclaration({
					key: GoAST.createIdentifier("_"),
					value: valueIdentifier.value === "_" ? undefined : valueIdentifier,
				}),
				expression: iterableIdentifier,
				body: bodyBlock,
			}),
		});
	},
);

export const whileStatementTransformer: Transformer<GoAST.Statement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isWhileStatement(node) && !TsAST.isDoStatement(node)) {
			return context.notSupport();
		}

		const condition = await transformCondition(node.expression, context);

		if (DEither.isLeft(condition)) {
			return condition;
		}

		const body = DEither.unwrapRight(await transformBranchToBlock(node.statement, context));

		if (DEither.isLeft(body)) {
			return body;
		}

		const exitUnlessCondition = GoAST.createIfStatement({
			condition: negate(condition.result),
			body: GoAST.createBlockStatement({ statements: [GoAST.createBreakStatement({})] }),
		});

		if (TsAST.isDoStatement(node)) {
			if (containsContinue(node.statement)) {
				return context.error(node, "do-while-with-continue-not-supported");
			}

			return context.success({
				result: GoAST.createForStatement({
					body: GoAST.createBlockStatement({
						statements: [...body.result.statements, ...condition.before, exitUnlessCondition],
					}),
				}),
			});
		}

		if (DArray.lengthEqual(condition.before, 0)) {
			return context.success({
				result: GoAST.createForStatement({
					condition: condition.result,
					body: body.result,
				}),
			});
		}

		return context.success({
			result: GoAST.createForStatement({
				body: prependStatements(body.result, [...condition.before, exitUnlessCondition]),
			}),
		});
	},
);

export const forStatementTransformer: Transformer<GoAST.Statement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isForStatement(node)) {
			return context.notSupport();
		}

		const initializer = node.initializer && TsAST.isVariableDeclarationList(node.initializer)
			? await DCommon.asyncPipe(
				context.transform(
					TsAST.factory.createVariableStatement(undefined, node.initializer),
					statementTransformers.value,
				),
				DEither.unwrapRight,
			)
			: undefined;

		if (node.initializer && !TsAST.isVariableDeclarationList(node.initializer)) {
			return context.error(node.initializer, "for-initializer-not-supported");
		}

		if (initializer && DEither.isLeft(initializer)) {
			return initializer;
		}

		const condition = node.condition ? await transformCondition(node.condition, context) : undefined;

		if (condition && DEither.isLeft(condition)) {
			return condition;
		}

		const post = node.incrementor
			? await DCommon.asyncPipe(
				context.transform(
					TsAST.factory.createExpressionStatement(node.incrementor),
					statementTransformers.value,
				),
				DEither.unwrapRight,
			)
			: undefined;

		if (post && DEither.isLeft(post)) {
			return post;
		}

		const body = DEither.unwrapRight(await transformBranchToBlock(node.statement, context));

		if (DEither.isLeft(body)) {
			return body;
		}

		if (
			(initializer && !DArray.lengthEqual(initializer.before, 0))
			|| (post && !DArray.lengthEqual(post.before, 0))
		) {
			return context.error(node, "for-statement-initializer-and-incrementor-must-be-simple");
		}

		// Condition avec préparations : évaluée en tête du corps. `continue` passe
		// par `post`, puis par la condition, comme en JS.
		const conditionInBody = condition && !DArray.lengthEqual(condition.before, 0);

		return context.success({
			result: GoAST.createForStatement({
				initializer: initializer?.result as ForParams["initializer"],
				condition: conditionInBody ? undefined : condition?.result,
				post: post?.result as ForParams["post"],
				body: conditionInBody
					? prependStatements(body.result, [
						...condition.before,
						GoAST.createIfStatement({
							condition: negate(condition.result),
							body: GoAST.createBlockStatement({ statements: [GoAST.createBreakStatement({})] }),
						}),
					])
					: body.result,
			}),
		});
	},
);

export const jumpStatementTransformer: Transformer<GoAST.Statement> = createTransformer(
	(node, context) => {
		if (TsAST.isBreakStatement(node) || TsAST.isContinueStatement(node)) {
			if (node.label) {
				return context.error(node, "labeled-jump-not-supported");
			}

			return context.success({
				result: TsAST.isBreakStatement(node)
					? GoAST.createBreakStatement({})
					: GoAST.createContinueStatement({}),
			});
		}

		return context.notSupport();
	},
);

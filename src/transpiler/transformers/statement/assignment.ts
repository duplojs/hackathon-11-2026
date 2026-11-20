import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../context/build";
import { transformIdentifierReference } from "../common/identifier";
import { coerceGoExpression } from "../duplojs/either/coerce";
import { isExpectedTypeEitherConstructor } from "../duplojs/either/constructor";
import { expressionTransformers } from "../expression";
import { goTypeOf, goTypeOfExpression } from "../type/goTypeOf";
import { renderGoType } from "../type/taggedUnion";

/**
 * Affectations d'une VARIABLE (ADR-14), en instruction : `x = e`, `x += e`
 * (`-=`, `*=`, `/=`, `%=`), `x++`, `x--`. La valeur est convertie vers le type
 * DÉCLARÉ de la variable (ex. membre vers union étiquetée). Les lectures
 * suivantes suivent le rétrécissement de TypeScript (ADR-13).
 *
 * L'affectation d'une PROPRIÉTÉ (`user.name = …`) est refusée : un objet JS est
 * une référence partagée, une struct Go une valeur copiée ; la modification
 * ne serait pas visible par les autres références.
 */

const compoundOperators: Partial<Record<TsAST.SyntaxKind, "+=" | "-=" | "*=" | "/=">> = {
	[TsAST.SyntaxKind.PlusEqualsToken]: "+=",
	[TsAST.SyntaxKind.MinusEqualsToken]: "-=",
	[TsAST.SyntaxKind.AsteriskEqualsToken]: "*=",
	[TsAST.SyntaxKind.SlashEqualsToken]: "/=",
};

const mathImportDeclaration = GoAST.createImportDeclaration({ path: "math" });

async function resolveTarget(target: TsAST.Expression, context: BuildContext) {
	if (!TsAST.isIdentifier(target)) {
		return context.error(target, "assignment-target-must-be-a-variable");
	}

	const reference = DEither.unwrapRight(await transformIdentifierReference(target, context));

	if (DEither.isLeft(reference)) {
		return reference;
	}

	const { typeChecker } = context.transpilation;
	const symbol = await typeChecker.getSymbolAtLocation(target);
	const declaredGoType = symbol && DEither.unwrapRight(
		await goTypeOf(await typeChecker.getTypeOfSymbol(symbol), target, context),
	);

	if (!declaredGoType || DEither.isLeft(declaredGoType)) {
		return context.error(target, "assignment-target-type-not-supported");
	}

	return DEither.right("assignment-target", {
		expression: reference.result,
		goType: declaredGoType.result,
	});
}

export const assignmentStatementTransformer: Transformer<GoAST.Statement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isExpressionStatement(node)) {
			return context.notSupport();
		}

		const { expression } = node;

		// x++, x--, ++x, --x
		if (
			(TsAST.isPostfixUnaryExpression(expression) || TsAST.isPrefixUnaryExpression(expression))
			&& (
				expression.operator === TsAST.SyntaxKind.PlusPlusToken
				|| expression.operator === TsAST.SyntaxKind.MinusMinusToken
			)
		) {
			const target = DEither.unwrapRight(await resolveTarget(expression.operand, context));

			if (DEither.isLeft(target)) {
				return target;
			}

			return context.success({
				result: GoAST.createCompoundAssignmentStatement({
					operator: expression.operator === TsAST.SyntaxKind.PlusPlusToken ? "+=" : "-=",
					target: DCommon.cast(target.expression),
					value: GoAST.createFloatLiteral({ value: "1" }),
				}),
			});
		}

		if (!TsAST.isBinaryExpression(expression)) {
			return context.notSupport();
		}

		const operatorKind = expression.operatorToken.kind;
		const isPlain = operatorKind === TsAST.SyntaxKind.EqualsToken;
		const compound = compoundOperators[operatorKind];
		const isRemainder = operatorKind === TsAST.SyntaxKind.PercentEqualsToken;

		if (!isPlain && !compound && !isRemainder) {
			return context.notSupport();
		}

		if (TsAST.isPropertyAccessExpression(expression.left) || TsAST.isElementAccessExpression(expression.left)) {
			return context.error(expression.left, "object-mutation-not-supported");
		}

		const target = DEither.unwrapRight(await resolveTarget(expression.left, context));

		if (DEither.isLeft(target)) {
			return target;
		}

		const value = await DCommon.asyncPipe(
			context.transform(expression.right, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(value)) {
			return value;
		}

		if (compound) {
			return context.success({
				before: value.before,
				result: GoAST.createCompoundAssignmentStatement({
					operator: compound,
					target: DCommon.cast(target.expression),
					value: value.result,
				}),
			});
		}

		if (isRemainder) {
			context.file.imports.add(mathImportDeclaration);

			return context.success({
				before: value.before,
				result: GoAST.createAssignmentStatement({
					targets: DCommon.cast([target.expression]),
					values: DCommon.cast([
						GoAST.createCallExpression({
							callee: GoAST.createSelectorExpression({
								target: GoAST.createIdentifier("math"),
								identifier: GoAST.createIdentifier("Mod"),
							}),
							arguments: [target.expression, value.result],
						}),
					]),
				}),
			});
		}

		const valueGoType = DEither.unwrapRight(await goTypeOfExpression(expression.right, context));
		const coerced = DEither.isLeft(valueGoType)
			|| renderGoType(valueGoType.result) === renderGoType(target.goType)
			|| await isExpectedTypeEitherConstructor(expression.right, context)
			? undefined
			: await coerceGoExpression({
				expression: value.result,
				fromGoType: valueGoType.result,
				toGoType: target.goType,
				from: await context.transpilation.typeChecker.getTypeAtLocation(expression.right),
			}, context);

		const assigned = coerced && !DEither.isLeft(coerced) ? DEither.unwrapRight(coerced).result : value.result;

		return context.success({
			before: value.before,
			result: GoAST.createAssignmentStatement({
				targets: DCommon.cast([target.expression]),
				values: DCommon.cast([assigned]),
			}),
		});
	},
);

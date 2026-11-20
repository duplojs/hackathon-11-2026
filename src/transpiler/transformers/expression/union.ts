import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { expressionTransformers } from ".";
import { type BuildContext } from "../../context/build";
import { nullShardDependency } from "../../sharedDependency/defaults/null";
import { coerceGoExpression } from "../duplojs/either/coerce";
import { goTypeOf, goTypeOfExpression, type GoType } from "../type/goTypeOf";
import { goBuilder as go } from "../type/goBuilder";
import {
	findUnionMemberIndex,
	getUnionMemberGoTypes,
	isNullishGoType,
	jsTypeOfGoType,
	narrowUnionExpression,
	renderGoType,
	unionTagField,
	unionValueField,
} from "../type/taggedUnion";

/**
 * Expressions liées aux unions étiquetées (ADR-13) : `null`, `typeof x`,
 * `a ?? b`, et `===` / `!==` quand un côté est une union ou une valeur nulle.
 */

async function goTypeOrUndefined(node: TsAST.Expression, context: BuildContext) {
	const goType = DEither.unwrapRight(await goTypeOfExpression(node, context));

	return DEither.isLeft(goType) ? undefined : goType.result;
}

function unionMembersOf(goType: GoType | undefined) {
	const members = goType && DEither.unwrapRight(getUnionMemberGoTypes(goType));

	return members && !DEither.isLeft(members) ? members : undefined;
}

async function transformToTemporary(node: TsAST.Expression, context: BuildContext) {
	const transformed = await DCommon.asyncPipe(
		context.transform(node, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(transformed)) {
		return transformed;
	}

	const temporary = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: transformed.result,
	});

	return DEither.right("temporary", {
		before: DArray.concat(transformed.before, [temporary]),
		identifier: temporary.identifier,
	});
}

async function transformForEffects(node: TsAST.Expression, context: BuildContext) {
	const transformed = await DCommon.asyncPipe(
		context.transform(node, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(transformed)) {
		return transformed;
	}

	const isPure = DModeling.hasTagValue(transformed.result, "[node][expression]literal-struct")
		|| DModeling.hasTagValue(transformed.result, "[node]identifier");

	return DEither.right("temporary", {
		before: isPure
			? transformed.before
			: DArray.concat(transformed.before, [
				GoAST.createAssignmentStatement({
					targets: DCommon.cast([GoAST.createIdentifier("_")]),
					values: DCommon.cast([transformed.result]),
				}),
			]),
		identifier: GoAST.createIdentifier("_"),
	});
}

export const nullLiteralTransformer: Transformer<GoAST.Expression> = createTransformer(
	(node, context) => {
		if (node.kind !== TsAST.SyntaxKind.NullKeyword) {
			return context.notSupport();
		}

		const packageName = context.registerSharedDependency(nullShardDependency.value);

		return context.success({
			result: GoAST.createStructLiteral({
				typeReference: GoAST.createPackageTypeReference({
					packageName,
					identifier: GoAST.createIdentifier("JSNull"),
				}),
				elements: [],
			}),
		});
	},
);

// `typeof x` : connu à la transpilation, sauf pour une union (lu dans l'étiquette).
export const typeOfExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTypeOfExpression(node)) {
			return context.notSupport();
		}

		const operandGoType = await goTypeOrUndefined(node.expression, context);

		if (!operandGoType) {
			return context.error(node, "typeof-operand-type-not-supported");
		}

		const operand = DEither.unwrapRight(await transformToTemporary(node.expression, context));

		if (DEither.isLeft(operand)) {
			return operand;
		}

		const members = unionMembersOf(operandGoType);

		if (!members) {
			const name = jsTypeOfGoType(operandGoType);

			return name
				? context.success({
					before: operand.before,
					result: GoAST.createStringLiteral({ value: name }),
				})
				: context.error(node, "typeof-operand-type-not-supported");
		}

		return context.success({
			before: operand.before,
			result: GoAST.createIndexExpression({
				target: GoAST.createSliceLiteral({
					typeReference: GoAST.createSliceType({ elementType: GoAST.builtinTypeReferences.string }),
					elements: DArray.map(
						members,
						(member) => GoAST.createStringLiteral({ value: jsTypeOfGoType(member) ?? "object" }),
					),
				}),
				index: go.select(operand.identifier, unionTagField),
			}),
		});
	},
);

/**
 * `typeof x === "string"` (ou `!==`, ou inversé) sur une union étiquetée : test
 * direct de l'étiquette (`x.Tag == 1`), sans construire le nom du type ni
 * comparer de chaînes. C'est la forme habituelle d'un rétrécissement.
 */
export const typeOfComparisonTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (
			!TsAST.isBinaryExpression(node)
			|| (
				node.operatorToken.kind !== TsAST.SyntaxKind.EqualsEqualsEqualsToken
				&& node.operatorToken.kind !== TsAST.SyntaxKind.ExclamationEqualsEqualsToken
			)
		) {
			return context.notSupport();
		}

		const [typeOfNode, literalNode] = TsAST.isTypeOfExpression(node.left)
			? [node.left, node.right]
			: [node.right, node.left];

		if (!TsAST.isTypeOfExpression(typeOfNode) || !TsAST.isStringLiteral(literalNode)) {
			return context.notSupport();
		}

		const members = unionMembersOf(await goTypeOrUndefined(typeOfNode.expression, context));

		if (!members) {
			return context.notSupport();
		}

		const operand = DEither.unwrapRight(await transformToTemporary(typeOfNode.expression, context));

		if (DEither.isLeft(operand)) {
			return operand;
		}

		const isEquality = node.operatorToken.kind === TsAST.SyntaxKind.EqualsEqualsEqualsToken;
		const matches = members.flatMap((member, index) => (
			jsTypeOfGoType(member) === literalNode.text
				? [go.equal(go.select(operand.identifier, unionTagField), go.integer(index))]
				: []
		));
		const condition = matches.length === 0
			? GoAST.createBooleanLiteral({ value: false })
			: matches.reduce((left, right) => GoAST.createBinaryExpression({
				operator: "||",
				left,
				right,
			}));

		return context.success({
			before: operand.before,
			result: isEquality
				? condition
				: GoAST.createUnaryExpression({
					operator: "!",
					operand: condition,
				}),
		});
	},
);

/**
 * `a ?? b` : si `a` est une union qui contient undefined ou null,
 * `t := a ; var r R ; if t.Tag == i || … { before(b) ; r = b } else { r = t rétréci }`.
 * `b` n'est évalué que si nécessaire, comme en JS.
 */
export const nullishCoalescingTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isBinaryExpression(node) || node.operatorToken.kind !== TsAST.SyntaxKind.QuestionQuestionToken) {
			return context.notSupport();
		}

		const leftGoType = await goTypeOrUndefined(node.left, context);
		const resultType = await context.transpilation.typeChecker.getTypeAtLocation(node);
		const resultGoType = DEither.unwrapRight(await goTypeOf(resultType, node, context));
		const members = unionMembersOf(leftGoType);

		if (!leftGoType || DEither.isLeft(resultGoType)) {
			return context.error(node, "nullish-coalescing-type-not-supported");
		}

		const left = DEither.unwrapRight(await transformToTemporary(node.left, context));

		if (DEither.isLeft(left)) {
			return left;
		}

		const nullishIndexes = members
			? members.flatMap((member, index) => (isNullishGoType(member) ? [index] : []))
			: [];

		// Gauche jamais nulle : la droite n'est jamais évaluée.
		if (DArray.lengthEqual(nullishIndexes, 0) && !isNullishGoType(leftGoType)) {
			const coerced = await coerceGoExpression({
				expression: left.identifier,
				fromGoType: leftGoType,
				toGoType: resultGoType.result,
			}, context);

			return DEither.isLeft(coerced)
				? context.error(node, "nullish-coalescing-type-not-supported")
				: context.success({
					before: left.before,
					result: DEither.unwrapRight(coerced).result,
				});
		}

		const right = await DCommon.asyncPipe(
			context.transform(node.right, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(right)) {
			return right;
		}

		const rightGoType = await goTypeOrUndefined(node.right, context);
		const coercedRight = rightGoType && await coerceGoExpression({
			expression: right.result,
			fromGoType: rightGoType,
			toGoType: resultGoType.result,
		}, context);

		if (!coercedRight || DEither.isLeft(coercedRight)) {
			return context.error(node.right, "nullish-coalescing-type-not-supported");
		}

		const result = context.generateIdentifier();
		const resultDeclaration = GoAST.createVariableDeclarationZeroValue({
			identifier: result,
			typeReference: DCommon.cast(resultGoType.result),
		});

		const assignRight = GoAST.createAssignmentStatement({
			targets: DCommon.cast([result]),
			values: DCommon.cast([DEither.unwrapRight(coercedRight).result]),
		});

		if (!members) {
			// Gauche toujours nulle (type undefined ou null seul) : la droite.
			return context.success({
				before: DArray.concat(
					left.before,
					[resultDeclaration],
					right.before,
					[assignRight],
				),
				result,
			});
		}

		const narrowed = narrowUnionExpression(left.identifier, leftGoType, resultGoType.result, context);
		const leftValue = DEither.isLeft(narrowed)
			? await coerceGoExpression({
				expression: left.identifier,
				fromGoType: leftGoType,
				toGoType: resultGoType.result,
			}, context)
			: narrowed;

		if (DEither.isLeft(leftValue)) {
			return context.error(node.left, "nullish-coalescing-type-not-supported");
		}

		const isNullish = nullishIndexes
			.map((index) => go.equal(go.select(left.identifier, unionTagField), go.integer(index)))
			.reduce((condition, next) => GoAST.createBinaryExpression({
				operator: "||",
				left: condition,
				right: next,
			}));

		return context.success({
			before: DArray.concat(
				left.before,
				[
					resultDeclaration,
					go.if(
						isNullish,
						[...right.before, assignRight],
						[
							GoAST.createAssignmentStatement({
								targets: DCommon.cast([result]),
								values: DCommon.cast([DEither.unwrapRight(leftValue).result]),
							}),
						],
					),
				],
			),
			result,
		});
	},
);

/**
 * `===` / `!==` quand un côté est une union étiquetée (`x === undefined`,
 * `x === "a"`) ou quand une valeur nulle est comparée à un autre type (toujours
 * faux). Les deux côtés sont évalués dans l'ordre JS. Sinon : notSupport, et le
 * transformer binaire général s'applique (décision prise AVANT toute traduction).
 */
export const unionEqualityTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (
			!TsAST.isBinaryExpression(node)
			|| (
				node.operatorToken.kind !== TsAST.SyntaxKind.EqualsEqualsEqualsToken
				&& node.operatorToken.kind !== TsAST.SyntaxKind.ExclamationEqualsEqualsToken
			)
		) {
			return context.notSupport();
		}

		const leftGoType = await goTypeOrUndefined(node.left, context);
		const rightGoType = await goTypeOrUndefined(node.right, context);

		if (!leftGoType || !rightGoType || renderGoType(leftGoType) === renderGoType(rightGoType)) {
			return context.notSupport();
		}

		const leftMembers = unionMembersOf(leftGoType);
		const rightMembers = unionMembersOf(rightGoType);
		const isNullishMismatch = !leftMembers && !rightMembers
			&& (isNullishGoType(leftGoType) || isNullishGoType(rightGoType));

		if (!isNullishMismatch && (Boolean(leftMembers) === Boolean(rightMembers))) {
			return context.notSupport();
		}

		// Un côté de type undefined ou null n'est lu que pour ses effets : sa valeur
		// (struct vide) n'est pas comparée, donc pas rangée dans une variable.
		const left = DEither.unwrapRight(
			isNullishGoType(leftGoType)
				? await transformForEffects(node.left, context)
				: await transformToTemporary(node.left, context),
		);

		if (DEither.isLeft(left)) {
			return left;
		}

		const right = DEither.unwrapRight(
			isNullishGoType(rightGoType)
				? await transformForEffects(node.right, context)
				: await transformToTemporary(node.right, context),
		);

		if (DEither.isLeft(right)) {
			return right;
		}

		const isEquality = node.operatorToken.kind === TsAST.SyntaxKind.EqualsEqualsEqualsToken;
		const before = DArray.concat(left.before, right.before);
		const [union, members, other, otherGoType] = leftMembers
			? [left.identifier, leftMembers, right.identifier, rightGoType] as const
			: [right.identifier, rightMembers, left.identifier, leftGoType] as const;
		const index = members ? findUnionMemberIndex(members, otherGoType) : -1;

		if (index < 0) {
			return context.success({
				before,
				result: GoAST.createBooleanLiteral({ value: !isEquality }),
			});
		}

		const tagMatches = go.equal(go.select(union, unionTagField), go.integer(index));
		const condition = isNullishGoType(otherGoType)
			? tagMatches
			: GoAST.createBinaryExpression({
				operator: "&&",
				left: tagMatches,
				right: go.equal(go.select(union, unionValueField(index)), other),
			});

		return context.success({
			before,
			result: isEquality
				? condition
				: GoAST.createUnaryExpression({
					operator: "!",
					operand: condition,
				}),
		});
	},
);

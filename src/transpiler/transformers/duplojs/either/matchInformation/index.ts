import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { transformTypeOfExpression } from "../../../type/ofExpression";
import { describeEitherMember, resolveEitherTypeMember, type EitherMemberSide } from "../eitherType";
import { eitherInformationFieldIdentifier, eitherLeftFieldIdentifier, eitherRightFieldIdentifier } from "../sharedDependency";
import { createSimpleAssignment } from "../../../common";
import { inlineCallback } from "../../../common/inlineCallback";

/** Côté (left ou right) de chaque information, lu dans le type TS. */
async function getInformationSides(
	input: TsAST.Expression,
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;
	const inputTypeNode = await typeChecker.typeToTypeNode(
		await typeChecker.getTypeAtLocation(input),
		input,
	);

	if (!inputTypeNode) {
		return context.error(input, "either-match-information-unknown-input-type");
	}

	const members = await DCommon.asyncPipe(
		TsAST.isUnionTypeNode(inputTypeNode) ? inputTypeNode.types : [inputTypeNode],
		DArray.map(async(typeNode) => {
			const member = await resolveEitherTypeMember(typeNode, context);

			return member && describeEitherMember(member);
		}),
		DCommon.promiseAll,
	);

	const sides = DArray.filter(
		members,
		(member): member is EitherMemberSide => member?.information !== undefined,
	);

	if (sides.length !== members.length) {
		// Pas un Either, ou information inconnue.
		return context.error(input, "either-match-information-input-not-supported");
	}

	return DEither.right("information-sides", sides);
}

/** Ce que tous les case partagent. */
interface MatchSwitch {
	readonly either: GoAST.Identifier;
	readonly result: GoAST.Identifier;
	readonly sides: readonly EitherMemberSide[];
}

/** Un traitement du matcher devient un case du switch. */
async function transformMatchCase(
	property: TsAST.ObjectLiteralElementLike,
	{ either, result, sides }: MatchSwitch,
	context: BuildContext,
) {
	if (
		!TsAST.isPropertyAssignment(property)
		|| (!TsAST.isIdentifier(property.name) && !TsAST.isStringLiteral(property.name))
	) {
		return context.error(property, "either-match-information-property-not-supported");
	}

	const information = property.name.text;
	const sidesOfInformation = DArray.filter(sides, (side) => side.information === information);
	const [firstSide] = sidesOfInformation;

	if (!firstSide) {
		// Clé en trop : TS l'interdit déjà.
		return context.error(property, "either-match-information-unknown-information");
	}

	if (DArray.some(sidesOfInformation, (side) => side.side !== firstSide.side)) {
		// Information des deux côtés : pas un seul type Go.
		return context.error(property, "either-match-information-information-on-both-sides");
	}

	// La valeur est lue dans .Left ou .Right.
	const handler = await inlineCallback(
		property.initializer,
		GoAST.createSelectorExpression({
			target: either,
			identifier: firstSide.side === "left"
				? eitherLeftFieldIdentifier
				: eitherRightFieldIdentifier,
		}),
		context,
	);

	if (DEither.isLeft(handler)) {
		return handler;
	}

	const { before, result: handlerResult } = DEither.unwrapRight(handler);

	return DEither.right(
		"match-case",
		GoAST.createExpressionSwitchCase({
			expressions: DCommon.cast([GoAST.createStringLiteral({ value: information })]),
			statements: DArray.push(
				before,
				createSimpleAssignment(result, handlerResult),
			),
		}),
	);
}

/**
 * matchInformation : un switch sur l'information, un case par traitement.
 * Pas de default : TS oblige déjà à tout traiter.
 */
export async function matchInformationExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		// Passé comme valeur : non géré.
		return context.error(node, "either-match-information-used-as-value");
	}

	const [input, matcher] = node.arguments;

	if (!input || !matcher || node.arguments.length !== 2) {
		// Forme courte (pour un pipe) : pas encore gérée.
		return context.error(node, "either-match-information-expects-two-arguments");
	}

	if (!TsAST.isObjectLiteralExpression(matcher)) {
		return context.error(matcher, "either-match-information-matcher-not-object");
	}

	const sides = await getInformationSides(input, context);

	if (DEither.isLeft(sides)) {
		return sides;
	}

	const resultType = await transformTypeOfExpression(node, context);

	if (DEither.isLeft(resultType)) {
		return resultType;
	}

	const either = await DCommon.asyncPipe(
		context.transform(input, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(either)) {
		return either;
	}

	const eitherAssignment = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: either.result,
	});
	const resultIdentifier = context.generateIdentifier();

	const cases = await DCommon.asyncPipe(
		matcher.properties,
		DArray.map(
			(property) => transformMatchCase(
				property,
				{
					either: eitherAssignment.identifier,
					result: resultIdentifier,
					sides: DEither.unwrapRight(sides),
				},
				context,
			),
		),
		DCommon.promiseAll,
	);

	const failedCase = DArray.find(cases, DEither.isLeft);

	if (failedCase) {
		return failedCase;
	}

	return context.success({
		before: DArray.concat(
			resultType.before,
			either.before,
			[
				eitherAssignment,
				GoAST.createVariableDeclarationZeroValue({
					identifier: resultIdentifier,
					typeReference: resultType.result,
				}),
				GoAST.createExpressionSwitchStatementWithoutDefault({
					expression: GoAST.createSelectorExpression({
						target: eitherAssignment.identifier,
						identifier: eitherInformationFieldIdentifier,
					}),
					cases: DArray.map(
						DArray.filter(cases, DEither.isRight),
						DEither.unwrapRight,
					),
				}),
			],
		),
		result: resultIdentifier,
	});
}

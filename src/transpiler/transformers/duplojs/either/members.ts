import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST, GoPrinter } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind, type Type } from "typescript/async";
import type { BuildContext } from "../../../context/build";
import { createUnionTagTest, resolveCheckerUnion, unwrapPromiseType, type CheckerUnion, type GoType } from "../../type";
export { unwrapPromiseType };
import { createUnionValueIdentifier, unionTagIdentifier } from "../../type/union/sharedDependency";
import { successTypeIdentifier } from "./success/sharedDependency";
import { failTypeIdentifier } from "./fail/sharedDependency";
import { leftTypeIdentifier } from "./left/sharedDependency";
import { rightTypeIdentifier } from "./right/sharedDependency";
import { errorTypeIdentifier } from "./error/sharedDependency";

// Outils communs aux fonctions DuploJS qui aiguillent un résultat selon sa variante
// (`rightPipe`, `group`, `whenIsRightOtherwise`). Le classement d'une variante est fait à la
// compilation à partir de sa représentation Go, elle-même dérivée du type TypeScript :
// à l'exécution il ne reste qu'une comparaison d'étiquette (`Tag`).

export type EitherSide = "left" | "right" | "other";

export interface EitherMember {
	readonly index: number;
	readonly side: EitherSide;
	readonly goType: GoType;
}

export interface EitherInput {
	readonly union: CheckerUnion;
	readonly members: readonly EitherMember[];
}

function getSharedTypeName(type: GoType) {
	if (DModeling.hasTagValue(type, "[node]type-reference-package")) {
		return type.identifier.value;
	}

	if (
		DModeling.hasTagValue(type, "[node]type-reference-generic")
		&& DModeling.hasTagValue(type.typeReference, "[node]type-reference-package")
	) {
		return type.typeReference.identifier.value;
	}

	return undefined;
}

export function getEitherSide(type: GoType): EitherSide {
	const name = getSharedTypeName(type);

	if (name === leftTypeIdentifier.value || name === failTypeIdentifier.value || name === errorTypeIdentifier.value) {
		return "left";
	}

	if (name === successTypeIdentifier.value || name === rightTypeIdentifier.value) {
		return "right";
	}

	return "other";
}

export async function resolveEitherInput(
	type: Type,
	location: TsAST.Node,
	context: BuildContext,
) {
	const effectiveType = await unwrapPromiseType(type, context);
	const union = await resolveCheckerUnion(effectiveType, location, context);

	if (DEither.isLeft(union)) {
		return union;
	}

	const checkerUnion = DEither.unwrapRight(union);

	return DEither.success<EitherInput>({
		union: checkerUnion,
		members: DArray.map(
			checkerUnion.members,
			(member, { index }) => ({
				index,
				side: getEitherSide(member.type),
				goType: member.type,
			}),
		),
	});
}

export function filterSide(input: EitherInput, side: EitherSide) {
	return DArray.filter(input.members, (member) => member.side === side);
}

// Valeur Go du membre : le champ `V{n}` d'une union étiquetée, ou la valeur elle-même.
export function getMemberValue(
	expression: GoAST.Expression,
	input: EitherInput,
	member: EitherMember,
): GoAST.Expression {
	return input.union.unionReference
		? GoAST.createSelectorExpression({
			target: expression,
			identifier: createUnionValueIdentifier(member.index),
		})
		: expression;
}

export function getEitherValue(expression: GoAST.Expression): GoAST.Expression {
	return GoAST.createSelectorExpression({
		target: expression,
		identifier: GoAST.createIdentifier("Value"),
	});
}

// Test à l'exécution de l'appartenance à l'un des membres donnés. Une valeur qui n'est pas une
// union est connue à la compilation : le test devient `true` ou `false`.
export function createMembersTest(
	expression: GoAST.Expression,
	input: EitherInput,
	members: readonly EitherMember[],
) {
	return createUnionTagTest(
		expression,
		input.union,
		DArray.map(members, (member) => member.index),
	);
}

export function isConstantTest(test: GoAST.Expression): test is GoAST.BooleanLiteral {
	return DModeling.hasTagValue(test, "[node][expression]literal-boolean");
}

export interface PlaceValueParams {
	readonly expression: GoAST.Expression;
	readonly goType: GoType;
	readonly target: Type;
	readonly location: TsAST.Node;
	readonly context: BuildContext;
}

// Place une valeur Go dans le type attendu : telle quelle si la représentation est identique,
// sinon dans le membre de l'union cible qui a cette représentation.
export async function placeValue(params: PlaceValueParams) {
	const { expression, goType, target, location, context } = params;

	const effectiveTarget = await unwrapPromiseType(target, context);
	const targetUnion = await resolveCheckerUnion(effectiveTarget, location, context);

	if (DEither.isLeft(targetUnion)) {
		return targetUnion;
	}

	const { type, unionReference, members } = DEither.unwrapRight(targetUnion);
	const key = GoPrinter.renderNode(goType);

	if (GoPrinter.renderNode(type) === key) {
		return DEither.success<GoAST.Expression>(expression);
	}

	const index = DArray.findIndex(members, (member) => member.key === key);

	if (!unionReference || index === undefined) {
		return context.error(location, "either-value-does-not-match-expected-type");
	}

	return DEither.success<GoAST.Expression>(
		GoAST.createStructLiteral({
			typeReference: unionReference,
			elements: [
				GoAST.createKeyedElement({
					key: unionTagIdentifier,
					value: GoAST.createIntegerLiteral({ value: BigInt(index) }),
				}),
				GoAST.createKeyedElement({
					key: createUnionValueIdentifier(index),
					value: expression,
				}),
			],
		}),
	);
}

export interface FunctionTypes {
	readonly parameters: readonly Type[];
	readonly returnType: Type;
}

// Paramètres et retour d'un type fonction (callback, fonction curryfiée).
export async function getFunctionTypes(
	type: Type,
	location: TsAST.Node,
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;
	const signatures = await typeChecker.getSignaturesOfType(type, SignatureKind.Call);
	const [signature] = signatures;

	if (!signature || !DArray.lengthEqual(signatures, 1)) {
		return context.error(location, "function-type-without-single-signature");
	}

	const parameters = await DCommon.asyncPipe(
		signature.getParameters(),
		(symbols) => typeChecker.getTypeOfSymbol(symbols),
	);

	return DEither.success<FunctionTypes>({
		parameters,
		returnType: await typeChecker.getReturnTypeOfSignature(signature),
	});
}

// Types d'un callback passé en argument. Une fonction écrite sur place a ses propres types
// (son nombre réel de paramètres compte pour l'appel Go). Une référence à une fonction générique
// (`DString.to`) est traduite selon le type attendu à cet endroit, que fournit le contexte.
export async function getCallbackTypes(
	node: TsAST.Expression,
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;
	const ownType = await typeChecker.getTypeAtLocation(node);

	if (TsAST.isArrowFunction(node) || TsAST.isFunctionExpression(node)) {
		return getFunctionTypes(ownType, node, context);
	}

	const contextualType = await typeChecker.getContextualType(node);

	return getFunctionTypes(contextualType ?? ownType, node, context);
}

import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../context/build";
import { transformCallExpression } from "../../shared";
import { goTypeOfExpression } from "../../type/goTypeOf";
import { goBuilder as go } from "../../type/goBuilder";
import { coerceGoExpression } from "./coerce";
import {
	either2FailOfFunctionIdentifier,
	either2LeftOfFunctionIdentifier,
	eitherConversionDependency,
} from "./conversionDependency";
import { resolveExpectedEitherGoType } from "./expectedValueType";
import { getEither2GoTypes, getEitherValueGoType } from "./goType";
import {
	either2SuccessFunctionIdentifier,
	eitherDependency,
	eitherFailFunctionIdentifier,
	eitherLeftFunctionIdentifier,
	eitherSuccessFunctionIdentifier,
} from "./sharedDependency";

export type EitherConstructorKind = "success" | "fail" | "left";

const constructorIdentifiers = {
	success: {
		either: eitherSuccessFunctionIdentifier,
		either2: either2SuccessFunctionIdentifier,
	},
	fail: {
		either: eitherFailFunctionIdentifier,
		either2: either2FailOfFunctionIdentifier,
	},
	left: {
		either: eitherLeftFunctionIdentifier,
		either2: either2LeftOfFunctionIdentifier,
	},
} as const;

// Rang de l'argument qui porte la valeur : success(value), left(information, value).
const valueArgumentIndex = {
	success: 0,
	fail: undefined,
	left: 1,
} as const;

/**
 * Constructeur Either (`success`, `fail`, `left`) construit DIRECTEMENT dans le
 * type attendu au site (C11) : Either[V], ou Either2[L, R] depuis l'ADR-13
 * (`Either2LeftOf`, `Either2SuccessOf`, `Either2FailOf`). L'argument valeur est
 * converti vers son côté (ex. `string` vers le membre d'une union étiquetée) ;
 * quand il a déjà le bon type, le Go est inchangé.
 */
export async function createEitherConstructorCall(
	node: TsAST.CallExpression,
	kind: EitherConstructorKind,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const expected = DEither.unwrapRight(await resolveExpectedEitherGoType(node, context));

	if (DEither.isLeft(expected)) {
		return expected;
	}

	const either2 = DEither.unwrapRight(getEither2GoTypes(expected));
	const eitherValue = DEither.unwrapRight(getEitherValueGoType(expected));

	if (DEither.isLeft(eitherValue)) {
		return context.error(node, "unable-to-resolve-either-value-type");
	}

	const callee = DEither.isLeft(either2)
		? go.instantiate(
			go.select(context.registerSharedDependency(eitherDependency.value), constructorIdentifiers[kind].either),
			[eitherValue],
		)
		: go.instantiate(
			go.select(
				kind === "success"
					? context.registerSharedDependency(eitherDependency.value)
					: context.registerSharedDependency(eitherConversionDependency.value),
				constructorIdentifiers[kind].either2,
			),
			[either2.leftType, either2.rightType],
		);

	const call = await DCommon.asyncPipe(
		transformCallExpression(node, context, callee),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(call)) {
		return call;
	}

	const index = valueArgumentIndex[kind];
	const valueNode = index === undefined ? undefined : DArray.at(node.arguments, index);

	if (index === undefined || !valueNode) {
		return context.success(call);
	}

	const either2Side = !DEither.isLeft(either2) && kind === "left"
		? either2.leftType
		: undefined;
	const targetGoType = DEither.isLeft(either2)
		? eitherValue
		: either2Side ?? either2.rightType;
	const valueGoType = DEither.unwrapRight(await goTypeOfExpression(valueNode, context));
	const result = call.result as GoAST.CallExpression;
	const argument = DArray.at(result.arguments, index);

	if (DEither.isLeft(valueGoType) || !argument) {
		return context.success(call);
	}

	const coerced = await coerceGoExpression({
		expression: argument,
		fromGoType: valueGoType.result,
		toGoType: targetGoType,
	}, context);

	if (DEither.isLeft(coerced) || DEither.unwrapRight(coerced).result === argument) {
		return context.success(call);
	}

	return context.success({
		before: call.before,
		result: GoAST.createCallExpression({
			callee: result.callee,
			arguments: result.arguments.map(
				(element, elementIndex) => (elementIndex === index ? DEither.unwrapRight(coerced).result : element),
			),
		}),
	});
}

/**
 * Le constructeur prend lui-même le type attendu (contextuel ou de retour) : son
 * type TS (`Fail`, `Left<…>`) ne décrit pas le Go produit, il ne faut donc pas
 * le convertir une seconde fois (retour, argument, initialiseur).
 */
export async function isExpectedTypeEitherConstructor(node: TsAST.Expression, context: BuildContext) {
	if (
		!TsAST.isCallExpression(node)
		|| (!TsAST.isIdentifier(node.expression) && !TsAST.isPropertyAccessExpression(node.expression))
	) {
		return false;
	}

	const reference = DEither.unwrapRight(
		await context.resolveReferenceModule(node.expression, "@duplojs/lang", /^dist\/either\//),
	);

	return !DEither.isLeft(reference) && ["success", "fail", "left"].includes(reference.symbol.name);
}
